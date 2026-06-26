import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents, ServerToClientEvents,
  InterServerEvents, SocketData, CreateRoomDto, GameMode,
} from '@quizracer/shared-types';
import { RoomsService } from '../../game/rooms/rooms.service';
import { RedisService, TTL } from '../../redis/redis.service';
import { QuizGateway } from './quiz.gateway';

type QRSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const COUNTDOWN_SECONDS = 5;

@WebSocketGateway()
export class RoomGateway {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  private readonly logger = new Logger(RoomGateway.name);
  private readonly countdownTimers = new Map<string, NodeJS.Timeout[]>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly redis: RedisService,
    @Inject(forwardRef(() => QuizGateway))
    private readonly quizGateway: QuizGateway,
  ) {}

  @SubscribeMessage('room:create')
  async handleCreate(@ConnectedSocket() socket: QRSocket, @MessageBody() dto: CreateRoomDto) {
    try {
      const room = await this.roomsService.create(socket.data.userId, dto);
      await socket.join(`room:${room.id}`);
      socket.data.roomId = room.id;
      await this.redis.set(`socket_room:${socket.data.userId}`, { roomId: room.id }, TTL.SIX_HOURS);
      return { success: true, data: room };
    } catch (err: any) {
      this.logger.warn(`room:create failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('room:join')
  async handleJoin(@ConnectedSocket() socket: QRSocket, @MessageBody() payload: { code: string }) {
    try {
      if (!payload?.code) return { success: false, error: 'Room code required' };
      const room = await this.roomsService.join(payload.code, socket.data.userId);
      await socket.join(`room:${room.id}`);
      socket.data.roomId = room.id;
      await this.redis.set(`socket_room:${socket.data.userId}`, { roomId: room.id }, TTL.SIX_HOURS);
      const participant = room.participants.find((p) => p.userId === socket.data.userId);
      if (participant) socket.to(`room:${room.id}`).emit('room:player_joined', participant);
      this.server.to(`room:${room.id}`).emit('room:updated', room);
      return { success: true, data: room };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeave(@ConnectedSocket() socket: QRSocket) {
    try {
      const { userId, roomId, username } = socket.data;
      if (!roomId) return { success: true };
      this.cancelCountdown(roomId);
      await this.roomsService.leave(roomId, userId);
      await socket.leave(`room:${roomId}`);
      socket.data.roomId = null;
      await this.redis.del(`socket_room:${userId}`);
      await this.redis.del(`disconnect:${userId}:${roomId}`);
      this.server.to(`room:${roomId}`).emit('room:player_left', { userId, username });
      const updated = await this.roomsService.findByIdSafe(roomId);
      if (updated) {
        this.server.to(`room:${roomId}`).emit('room:updated', updated);
      } else {
        this.server.to(`room:${roomId}`).emit('room:disbanded', { reason: 'Host left' });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('room:ready')
  async handleReady(@ConnectedSocket() socket: QRSocket) {
    try {
      const { userId, roomId } = socket.data;
      if (!roomId) return { success: false, error: 'Not in a room' };
      const isReady = await this.roomsService.toggleReady(roomId, userId);
      this.server.to(`room:${roomId}`).emit('room:player_ready', { userId, isReady });
      if (isReady) {
        const canStart = await this.roomsService.canStart(roomId);
        if (canStart) {
          const lockKey = `countdown_lock:${roomId}`;
          const acquired = await this.redis.getClient().set(lockKey, '1', 'EX', 10, 'NX');
          if (acquired) this.startCountdown(roomId);
        }
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('room:kick')
  async handleKick(@ConnectedSocket() socket: QRSocket, @MessageBody() payload: { userId: string }) {
    try {
      const { userId: hostId, roomId } = socket.data;
      if (!roomId) return { success: false, error: 'Not in a room' };
      await this.roomsService.kick(roomId, hostId, payload.userId);
      this.server.to(`user:${payload.userId}`).emit('room:disbanded', { reason: 'You were kicked' });
      this.server.to(`room:${roomId}`).emit('room:player_left', { userId: payload.userId, username: '' });
      const updated = await this.roomsService.findByIdSafe(roomId);
      if (updated) this.server.to(`room:${roomId}`).emit('room:updated', updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('room:spectate')
  async handleSpectate(@ConnectedSocket() socket: QRSocket, @MessageBody() payload: { code: string }) {
    try {
      const room = await this.roomsService.spectate(payload.code, socket.data.userId);
      await socket.join(`room:${room.id}`);
      socket.data.roomId = room.id;
      return { success: true, data: room };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // ── Countdown with Redis distributed lock ──────────────────

  startCountdown(roomId: string): void {
    const startTs = Date.now();
    this.redis.set(`countdown:${roomId}`, { startTs, seconds: COUNTDOWN_SECONDS }, 30).catch(() => {});
    this.roomsService.setStatus(roomId, 'COUNTDOWN').catch(() => {});

    const timers: NodeJS.Timeout[] = [];
    this.countdownTimers.set(roomId, timers);

    for (let i = COUNTDOWN_SECONDS; i >= 1; i--) {
      timers.push(
        setTimeout(() => {
          this.server.to(`room:${roomId}`).emit('room:countdown', { seconds: i });
        }, (COUNTDOWN_SECONDS - i) * 1000),
      );
    }

    timers.push(
      setTimeout(async () => {
        this.countdownTimers.delete(roomId);
        await this.redis.del(`countdown:${roomId}`);
        await this.redis.del(`countdown_lock:${roomId}`);
        try {
          await this.roomsService.setStatus(roomId, 'ACTIVE');
          const gameState = await this.roomsService.buildInitialGameState(roomId);
          this.server.to(`room:${roomId}`).emit('room:game_start', gameState as any);
          this.logger.log(`Game started: room=${roomId}`);

          // For quiz modes, schedule the first question timer
          const isQuizMode = [GameMode.QUIZ_RACE, GameMode.MIXED_MODE].includes(
            (gameState as any).mode ?? (await this.roomsService.getRoomMode(roomId)),
          );
          if (isQuizMode && (gameState as any).question) {
            const timePerRound = (gameState as any).timePerRound ?? 20;
            await this.quizGateway.scheduleQuestionTimer(
              roomId,
              timePerRound,
              (gameState as any).question.id,
            );
          }
        } catch (err: any) {
          this.logger.error(`Failed to start game for room ${roomId}: ${err.message}`);
          this.server.to(`room:${roomId}`).emit('room:disbanded', { reason: 'Failed to start game' });
          await this.roomsService.setStatus(roomId, 'CANCELLED').catch(() => {});
        }
      }, COUNTDOWN_SECONDS * 1000),
    );
  }

  cancelCountdown(roomId: string): void {
    const timers = this.countdownTimers.get(roomId);
    if (timers) { timers.forEach(clearTimeout); this.countdownTimers.delete(roomId); }
    Promise.all([
      this.redis.del(`countdown:${roomId}`),
      this.redis.del(`countdown_lock:${roomId}`),
    ]).catch(() => {});
  }
}
