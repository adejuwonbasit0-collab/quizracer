// apps/api/src/realtime/gateways/game.gateway.ts
import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  ConnectedSocket, MessageBody, OnGatewayInit,
  OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from '../../game/rooms/rooms.service';
import { TypingService } from '../../game/typing/typing.service';

interface AuthSocket extends Socket {
  userId: string;
  username: string;
  displayName: string;
  role: string;
}

@WebSocketGateway({
  cors: {
    origin: (_origin: string, cb: Function) => cb(null, true),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(GameGateway.name);

  // roomCode → Set<userId>
  private roomMembers = new Map<string, Set<string>>();
  // userId → roomCode
  private userRoom = new Map<string, string>();
  // roomCode → countdown timer
  private countdownTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly rooms: RoomsService,
    private readonly typing: TypingService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    server.use(async (socket: any, next) => {
      try {
        const token =
          socket.handshake.auth?.token ??
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) return next(new Error('Authentication token required'));

        const payload = this.jwt.verify(token, {
          secret: this.config.get<string>('app.jwtSecret'),
        });

        socket.userId      = payload.sub;
        socket.username    = payload.username;
        socket.displayName = payload.displayName ?? payload.username;
        socket.role        = payload.role ?? 'USER';
        next();
      } catch {
        next(new Error('Invalid or expired token'));
      }
    });
  }

  async handleConnection(client: AuthSocket) {
    this.logger.debug(`Connected: ${client.userId} (${client.id})`);
  }

  async handleDisconnect(client: AuthSocket) {
    this.logger.debug(`Disconnected: ${client.userId}`);
    const code = this.userRoom.get(client.userId);
    if (code) await this.leaveRoom(client, code);
  }

  @SubscribeMessage('room:create')
  async handleCreate(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { name: string; mode: string; isPrivate: boolean; maxPlayers: number },
    cb?: Function,
  ) {
    try {
      const room = await this.rooms.create({
        name: data.name ?? 'Quick Race',
        mode: data.mode ?? 'TYPING_RACE',
        isPrivate: !!data.isPrivate,
        maxPlayers: Math.min(data.maxPlayers ?? 6, 8),
        hostId: client.userId,
      });

      await this.rooms.addParticipant(room.id, client.userId, client.id, true);
      client.join(room.code);
      this.trackMember(room.code, client.userId);

      const payload = this.formatRoom(room);
      cb?.({ room: payload });
      return { room: payload };
    } catch (err: any) {
      cb?.({ error: err.message });
    }
  }

  @SubscribeMessage('room:join')
  async handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { code: string },
    cb?: Function,
  ) {
    try {
      if (!data?.code) throw new Error('Room code is required');
      const room = await this.rooms.findByCode(data.code);
      if (!room) throw new Error('Room not found');
      if (room.status === 'FINISHED' || room.status === 'DISBANDED') throw new Error('Room is no longer active');
      if (room.participants.length >= room.maxPlayers) throw new Error('Room is full');

      const prev = this.userRoom.get(client.userId);
      if (prev && prev !== room.code) await this.leaveRoom(client, prev);

      await this.rooms.addParticipant(room.id, client.userId, client.id, false);
      client.join(room.code);
      this.trackMember(room.code, client.userId);

      const participantPayload = {
        userId: client.userId,
        username: client.username,
        displayName: client.displayName,
        avatar: null,
        level: 1,
        isHost: false,
        isReady: false,
      };
      client.to(room.code).emit('room:player_joined', participantPayload);

      const updated = await this.rooms.findByCode(room.code);
      const payload = this.formatRoom(updated!);
      cb?.({ room: payload });
      return { room: payload };
    } catch (err: any) {
      cb?.({ error: err.message });
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeave(@ConnectedSocket() client: AuthSocket, _data: any, cb?: Function) {
    const code = this.userRoom.get(client.userId);
    if (code) await this.leaveRoom(client, code);
    cb?.({ success: true });
  }

  @SubscribeMessage('room:ready')
  async handleReady(@ConnectedSocket() client: AuthSocket, cb?: Function) {
    const code = this.userRoom.get(client.userId);
    if (!code) return cb?.({ error: 'Not in a room' });

    const room = await this.rooms.findByCode(code);
    if (!room) return cb?.({ error: 'Room not found' });

    const participant = room.participants.find((p: any) => p.userId === client.userId);
    if (!participant) return cb?.({ error: 'Not in this room' });

    const newReady = !(participant as any).isReady;
    await this.rooms.setReady(room.id, client.userId, newReady);
    this.server.to(code).emit('room:player_ready', { userId: client.userId, isReady: newReady });
    cb?.({ success: true, isReady: newReady });
  }

  @SubscribeMessage('room:start')
  async handleStart(@ConnectedSocket() client: AuthSocket, cb?: Function) {
    const code = this.userRoom.get(client.userId);
    if (!code) return cb?.({ error: 'Not in a room' });

    const room = await this.rooms.findByCode(code);
    if (!room) return cb?.({ error: 'Room not found' });
    if (room.hostId !== client.userId) return cb?.({ error: 'Only the host can start the race' });

    await this.rooms.updateStatus(room.id, 'STARTING');
    await this.startCountdown(code, room.id, room.mode);
    cb?.({ success: true });
  }

  @SubscribeMessage('typing:progress')
  handleTypingProgress(@ConnectedSocket() client: AuthSocket, @MessageBody() progress: any) {
    const code = this.userRoom.get(client.userId);
    if (!code) return;
    client.to(code).emit('typing:player_progress', { ...progress, userId: client.userId });
  }

  @SubscribeMessage('typing:finished')
  async handleTypingFinished(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { wpm: number; accuracy: number; errors: number; durationMs: number },
    cb?: Function,
  ) {
    const code = this.userRoom.get(client.userId);
    if (!code) return cb?.({ error: 'Not in a room' });

    // Anti-cheat
    if (this.typing.detectCheat(data.wpm)) {
      this.logger.warn(`Cheat flag: ${client.username} ${data.wpm} WPM`);
    }
    cb?.({ success: true });
  }

  // Fixed: key is 'content', not 'message'
  @SubscribeMessage('chat:send')
  handleChat(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { content: string },
    cb?: Function,
  ) {
    const code = this.userRoom.get(client.userId);
    if (!code) return cb?.({ error: 'Not in a room' });
    if (!data?.content?.trim()) return cb?.({ error: 'Empty message' });

    const msg = {
      id: Math.random().toString(36).slice(2),
      userId: client.userId,
      username: client.displayName ?? client.username,
      content: data.content.slice(0, 200).trim(),
      type: 'user' as const,
      createdAt: new Date().toISOString(),
    };
    this.server.to(code).emit('chat:message', msg);
    cb?.({ success: true });
  }

  @SubscribeMessage('matchmaking:join')
  async handleMatchmaking(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() data: { mode: string },
    cb?: Function,
  ) {
    try {
      const room = await this.rooms.create({
        name: '⚡ Matched Race',
        mode: data.mode ?? 'TYPING_RACE',
        isPrivate: false,
        maxPlayers: 4,
        hostId: client.userId,
      });
      await this.rooms.addParticipant(room.id, client.userId, client.id, true);
      client.join(room.code);
      this.trackMember(room.code, client.userId);

      const payload = this.formatRoom(room);
      client.emit('matchmaking:match_found', { room: payload });
      cb?.({ success: true });
    } catch (err: any) {
      cb?.({ error: err.message });
    }
  }

  @SubscribeMessage('matchmaking:cancel')
  handleCancelMM(@ConnectedSocket() client: AuthSocket, cb?: Function) {
    client.emit('matchmaking:status', { status: 'cancelled' });
    cb?.({ success: true });
  }

  // ── Helpers ───────────────────────────────────────────────
  private async leaveRoom(client: AuthSocket, code: string) {
    const room = await this.rooms.findByCode(code);
    if (!room) { this.untrackMember(code, client.userId); return; }

    await this.rooms.removeParticipant(room.id, client.userId);
    client.leave(code);
    this.untrackMember(code, client.userId);
    client.to(code).emit('room:player_left', { userId: client.userId });

    const members = this.roomMembers.get(code);
    if (!members || members.size === 0) {
      await this.rooms.updateStatus(room.id, 'DISBANDED');
      this.server.to(code).emit('room:disbanded');
      this.roomMembers.delete(code);
    }
  }

  private async startCountdown(code: string, roomId: string, mode: string) {
    let seconds = 3;
    this.server.to(code).emit('room:countdown', { seconds });

    const tick = setInterval(async () => {
      seconds--;
      if (seconds > 0) {
        this.server.to(code).emit('room:countdown', { seconds });
      } else {
        clearInterval(tick);
        this.countdownTimers.delete(code);
        await this.startGame(code, roomId);
      }
    }, 1000);

    this.countdownTimers.set(code, tick);
  }

  private async startGame(code: string, roomId: string) {
    await this.rooms.updateStatus(roomId, 'ACTIVE');
    const text = await this.typing.getRandomText();
    this.server.to(code).emit('room:game_start', {
      textContent: text.content,
      textId: text.id,
      startedAt: Date.now(),
    });
  }

  private trackMember(code: string, userId: string) {
    if (!this.roomMembers.has(code)) this.roomMembers.set(code, new Set());
    this.roomMembers.get(code)!.add(userId);
    this.userRoom.set(userId, code);
  }

  private untrackMember(code: string, userId: string) {
    this.roomMembers.get(code)?.delete(userId);
    if (this.userRoom.get(userId) === code) this.userRoom.delete(userId);
  }

  private formatRoom(room: any) {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      mode: room.mode,
      status: room.status,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      hostId: room.hostId,
      participants: (room.participants ?? []).map((p: any) => ({
        userId: p.userId,
        username: p.user?.username ?? p.username ?? '',
        displayName: p.user?.displayName ?? p.displayName ?? '',
        avatar: p.user?.avatar ?? p.avatar ?? null,
        level: p.user?.level ?? 1,
        isHost: p.isHost,
        isReady: p.isReady,
      })),
      createdAt: room.createdAt,
    };
  }
}