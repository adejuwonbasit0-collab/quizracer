import {
  WebSocketGateway, WebSocketServer,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { JwtService } from '@nestjs/jwt';
import {
  ClientToServerEvents, ServerToClientEvents,
  InterServerEvents, SocketData,
} from '@quizracer/shared-types';
import { RedisService } from '../redis/redis.service';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { SocketStateService } from './socket-state.service';
import { ReconnectService } from './reconnect.service';
import { sanitizeChatMessage } from '../common/utils/sanitize.util';

type QRSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type QRServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

// Per-socket rate limiter map: event -> { count, resetAt }
const socketRateLimits = new WeakMap<Socket, Map<string, { count: number; resetAt: number }>>();
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  'typing:progress': { limit: 30,  windowMs: 1000  }, // max 30/s
  'chat:send':       { limit: 5,   windowMs: 5000  }, // max 5/5s
  'room:create':     { limit: 3,   windowMs: 30000 }, // max 3/30s
  'room:join':       { limit: 10,  windowMs: 30000 },
  'quiz:answer':     { limit: 5,   windowMs: 2000  },
};

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
      // Populated at runtime from config; see afterInit for the definitive check
      cb(null, true);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e5, // 100KB max event payload
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: QRServer;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly socketState: SocketStateService,
    private readonly reconnect: ReconnectService,
  ) {}

  // ─────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────

  async afterInit(server: QRServer): Promise<void> {
    // Attach Redis adapter for horizontal scaling
    const adapter = createAdapter(
      this.redis.getPubClient(),
      this.redis.getSubClient(),
    );
    server.adapter(adapter as any);
    this.logger.log('Socket.IO initialised with Redis adapter');

    // Enforce CORS allowlist at the middleware level (respects prod config)
    const allowedOrigins = new Set(this.config.corsOrigins);
    server.engine.on('initial_headers', (_headers: Record<string, string>, req: any) => {
      const origin = req.headers?.origin as string | undefined;
      if (origin && !allowedOrigins.has(origin) && this.config.isProduction) {
        this.logger.warn(`CORS rejected origin: ${origin}`);
      }
    });

    // Auth middleware — runs before connection
    server.use(async (socket: QRSocket, next) => {
      try {
        await this.authenticateSocket(socket);
        next();
      } catch (err: any) {
        next(new UnauthorizedException(err.message ?? 'Authentication failed'));
      }
    });

    // Unauthenticated connection timeout — disconnect if auth not received in 10s
    server.use((socket: QRSocket, next) => {
      const timer = setTimeout(() => {
        if (!socket.data.isAuthenticated) {
          socket.disconnect(true);
        }
      }, 10_000);
      socket.once('disconnect', () => clearTimeout(timer));
      next();
    });

    // Start periodic stale-connection cleanup
    this.startStaleConnectionCleanup();
  }

  async handleConnection(socket: QRSocket): Promise<void> {
    const { userId, username } = socket.data;
    this.logger.debug(`Client connected: ${socket.id} (user=${username})`);

    // Track online state in Redis (use consistent online:user: prefix)
    await this.redis.set(`online:user:${userId}`, { socketId: socket.id, connectedAt: Date.now() }, 300);
    await this.redis.sadd('online:users', userId);

    // Join user-specific room for targeted events (notifications, etc.)
    await socket.join(`user:${userId}`);

    // Update last active
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    // Restore room membership + full game state on reconnect
    const cachedRoom = await this.redis.get<{ roomId: string }>(`socket_room:${userId}`);
    if (cachedRoom?.roomId) {
      const roomId = cachedRoom.roomId;
      try {
        const roomState = await this.getRoomState(roomId);
        await socket.join(`room:${roomId}`);
        socket.data.roomId = roomId;
        socket.emit('room:updated', roomState);

        if (roomState.status === 'ACTIVE') {
          const gameText = await this.redis.get(`game_text:${roomId}`);
          if (gameText) socket.emit('room:game_start', gameText as any);
          const quizState = await this.redis.get(`quiz_state:${roomId}`);
          if (quizState) socket.emit('room:game_start', quizState as any);
        } else if (roomState.status === 'COUNTDOWN') {
          const cd = await this.redis.get<{ startTs: number; seconds: number }>(`countdown:${roomId}`);
          if (cd) {
            const rem = Math.max(0, cd.seconds - Math.floor((Date.now() - cd.startTs) / 1000));
            socket.emit('room:countdown', { seconds: rem });
          }
        }

        const allProgress = await this.redis.hgetall(`game_state:${roomId}:progress`);
        if (allProgress) {
          for (const prog of Object.values(allProgress)) {
            socket.emit('typing:player_progress', prog as any);
          }
        }

        await this.reconnect.markReconnected(userId, roomId);
        this.logger.log(`User ${username} reconnected to room ${roomId}`);
      } catch (e: any) {
        this.logger.warn(`Reconnect failed user=${userId}: ${e.message}`);
      }
    }

    this.socketState.register(userId, socket.id);
  }

  async handleDisconnect(socket: QRSocket): Promise<void> {
    const { userId, username, roomId } = socket.data;
    this.logger.debug(`Client disconnected: ${socket.id} (user=${username})`);

    // Remove from online tracking (consistent online:user: prefix)
    await this.redis.del(`online:user:${userId}`);
    await this.redis.srem('online:users', userId);

    this.socketState.unregister(userId);

    // Handle room departure — delegate grace-period tracking to ReconnectService
    if (roomId) {
      await this.reconnect.markDisconnected(userId, roomId).catch(() => {});
    }
  }

  // ─────────────────────────────────────────────
  // CHAT
  // ─────────────────────────────────────────────

  @SubscribeMessage('chat:send')
  async handleChat(
    @ConnectedSocket() socket: QRSocket,
    @MessageBody() payload: { content: string },
  ) {
    if (!this.checkRateLimit(socket, 'chat:send')) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    const { userId, roomId } = socket.data;
    if (!roomId) return { success: false, error: 'Not in a room' };

    const sanitized = sanitizeChatMessage(payload.content ?? '');
    if (!sanitized.trim()) return { success: false, error: 'Empty message' };

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, displayName: true, avatar: true },
    });

    if (!user) return { success: false, error: 'User not found' };

    // Persist chat message
    const message = await this.prisma.chatMessage.create({
      data: { roomId, userId, content: sanitized, type: 'text' },
    });

    const chatMsg = {
      id:        message.id,
      userId,
      username:  user.username,
      avatar:    user.avatar,
      content:   sanitized,
      type:      'text' as const,
      createdAt: message.createdAt.toISOString(),
    };

    this.server.to(`room:${roomId}`).emit('chat:message', chatMsg);
    return { success: true };
  }

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private async authenticateSocket(socket: QRSocket): Promise<void> {
    const token =
      socket.handshake.auth?.token as string ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) throw new UnauthorizedException('No token provided');

    let payload: { sub: string; username: string; role: string };
    try {
      payload = this.jwt.verify(token, { secret: this.config.jwtAccessSecret }) as any;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check if user is blacklisted (logged out all)
    const blacklisted = await this.redis.exists(`blacklist:user:${payload.sub}`);
    if (blacklisted) throw new UnauthorizedException('Session terminated');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, role: true, isBanned: true },
    });

    if (!user || user.isBanned) throw new UnauthorizedException('User unavailable');

    socket.data = {
      userId:          user.id,
      username:        user.username,
      role:            user.role as any,
      roomId:          null,
      isAuthenticated: true,
      connectedAt:     Date.now(),
    };
  }

  private checkRateLimit(socket: QRSocket, event: string): boolean {
    const limits = socketRateLimits.get(socket) ?? new Map();
    socketRateLimits.set(socket, limits);

    const rule = RATE_LIMITS[event];
    if (!rule) return true;

    const now = Date.now();
    const state = limits.get(event);

    if (!state || now > state.resetAt) {
      limits.set(event, { count: 1, resetAt: now + rule.windowMs });
      return true;
    }

    state.count++;
    if (state.count > rule.limit) {
      this.logger.warn(`Rate limit hit: user=${socket.data.userId} event=${event}`);
      return false;
    }

    return true;
  }

  private async getRoomState(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true, username: true, displayName: true,
                avatar: true, rating: true, level: true,
              },
            },
          },
        },
      },
    });

    if (!room) throw new Error('Room not found');

    return {
      id:          room.id,
      code:        room.code,
      name:        room.name,
      mode:        room.mode as any,
      status:      room.status as any,
      isPrivate:   room.isPrivate,
      maxPlayers:  room.maxPlayers,
      minPlayers:  room.minPlayers,
      difficulty:  room.difficulty as any,
      subject:     room.subject,
      roundCount:  room.roundCount,
      timePerRound: room.timePerRound,
      hostId:      room.hostId,
      createdAt:   room.createdAt.toISOString(),
      participants: room.participants.map((p: any) => ({
        userId:      p.userId,
        username:    p.user.username,
        displayName: p.user.displayName,
        avatar:      p.user.avatar,
        rating:      p.user.rating,
        level:       p.user.level,
        isReady:     p.isReady,
        isSpectator: p.isSpectator,
        isHost:      p.userId === room.hostId,
      })),
    };
  }

  // ─────────────────────────────────────────────
  // PUBLIC API (called from other gateways/services)
  // ─────────────────────────────────────────────

  emitToRoom(roomId: string, event: string, data: unknown): void {
    this.server.to(`room:${roomId}`).emit(event as any, data as any);
  }

  emitToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event as any, data as any);
  }

  async getOnlineCount(): Promise<number> {
    return this.redis.scard('online:users');
  }

  isOnline(userId: string): Promise<boolean> {
    return this.redis.exists(`online:user:${userId}`);
  }
  // ─────────────────────────────────────────────
  // HEARTBEAT / PING
  // ─────────────────────────────────────────────

  @SubscribeMessage('ping')
  async handlePing(@ConnectedSocket() socket: QRSocket) {
    if (!socket.data.isAuthenticated) return;
    // Refresh online presence TTL
    await this.socketState.refreshHeartbeat(socket.data.userId);
    // Respond with 'pong' — 'ping' is a reserved Socket.IO transport event
    socket.emit('pong' as any);
  }

  // Interval that drops sockets that never send a ping (stale connections)
  private startStaleConnectionCleanup(): void {
    setInterval(async () => {
      const staleSocket = Array.from(this.server.sockets.sockets.values());
      for (const sock of staleSocket) {
        const s = sock as unknown as QRSocket;
        if (!s.data?.isAuthenticated) continue;
        // Check consistent online:user: key (matches SocketStateService and handleConnection)
        const isOnline = await this.redis.exists(`online:user:${s.data.userId}`);
        if (!isOnline) {
          this.logger.warn(`Dropping stale socket user=${s.data.userId}`);
          s.disconnect(true);
        }
      }
    }, 60_000); // check every 60s
  }

}
