import { RedisService, TTL } from '../../redis/redis.service';
import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents, ServerToClientEvents,
  InterServerEvents, SocketData,
  TypingProgressPayload, TypingFinishedPayload,
  CharacterState,
} from '@quizracer/shared-types';
import { TypingService } from '../../game/typing/typing.service';
import { AntiCheatService } from '../../game/anti-cheat.service';
import { validateWpm } from '../../common/utils/sanitize.util';

type QRSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const PROGRESS_THROTTLE_MS = 50;

@WebSocketGateway()
export class TypingGateway {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  private readonly logger = new Logger(TypingGateway.name);
  private readonly lastEmit = new Map<string, number>();

  constructor(
    private readonly redis: RedisService,
    private readonly typingService: TypingService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  @SubscribeMessage('typing:progress')
  async handleProgress(
    @ConnectedSocket() socket: QRSocket,
    @MessageBody() payload: TypingProgressPayload,
  ) {
    const { userId, roomId } = socket.data;
    if (!roomId) return;

    // Per-user throttle
    const key = `${roomId}:${userId}`;
    const now = Date.now();
    const last = this.lastEmit.get(key) ?? 0;
    if (now - last < PROGRESS_THROTTLE_MS) return;
    this.lastEmit.set(key, now);

    // Clamp all values — never trust client
    const progress  = Math.max(0, Math.min(100, payload.progress ?? 0));
    const wpm       = Math.max(0, Math.min(300, payload.wpm ?? 0));
    const accuracy  = Math.max(0, Math.min(100, payload.accuracy ?? 100));
    const errors    = Math.max(0, payload.errors ?? 0);
    const combo     = Math.max(0, payload.combo ?? 0);

    // Server-side anti-cheat on live progress
    const gameText = await this.redis.get<{ content: string; startedAt: number }>(`game_text:${roomId}`);
    if (gameText) {
      const acResult = await this.antiCheat.validateProgressUpdate(
        userId, roomId, progress, wpm, gameText.startedAt,
      );
      if (!acResult.isValid) {
        this.logger.warn(`Progress rejected: user=${userId} reason=${acResult.reason}`);
        return;
      }
    }

    const characterState = this.resolveCharacterState(accuracy, combo, wpm);
    const progressData = {
      userId, username: socket.data.username, avatar: null,
      progress, wpm, accuracy, errors, combo,
      score: this.calculateScore(wpm, accuracy, combo),
      position: 0, isFinished: false, finishedAt: null,
      characterState,
    };

    // Persist in Redis for reconnect recovery
    await this.redis.hset(`game_state:${roomId}:progress`, userId, progressData);
    await this.redis.expire(`game_state:${roomId}:progress`, TTL.SIX_HOURS);

    socket.to(`room:${roomId}`).emit('typing:player_progress', progressData);
  }

  @SubscribeMessage('typing:finished')
  async handleFinished(
    @ConnectedSocket() socket: QRSocket,
    @MessageBody() payload: TypingFinishedPayload,
  ) {
    const { userId, roomId } = socket.data;
    if (!roomId) return { success: false, error: 'Not in a room' };

    // Server-side anti-cheat validation
    const gameText = await this.redis.get<{ content: string; startedAt: number }>(`game_text:${roomId}`);
    if (gameText) {
      const actualDuration = Date.now() - gameText.startedAt;
      const acResult = this.antiCheat.validateTypingFinish({
        userId, roomId,
        wpm:        payload.wpm,
        accuracy:   payload.accuracy,
        durationMs: actualDuration,
        textLength: gameText.content.length,
        keystrokes: payload.keystrokes ?? [],
      });

      if (!acResult.isValid) {
        this.logger.warn(`Finish rejected: user=${userId} reason=${acResult.reason}`);
        socket.emit('error', { code: 'ANTICHEAT', message: acResult.reason ?? 'Invalid result' });
        return { success: false, error: 'Invalid result' };
      }

      // Use server-computed WPM if mismatch detected
      if (acResult.adjustedWpm !== undefined) {
        payload = { ...payload, wpm: acResult.adjustedWpm };
      }
    }

    try {
      const result = await this.typingService.recordFinish(roomId, userId, payload);
      this.server.to(`room:${roomId}`).emit('typing:player_finished', {
        userId, rank: result.rank, wpm: result.wpm,
      });

      const allDone = await this.typingService.checkAllFinished(roomId);
      if (allDone) {
        const results = await this.typingService.endRace(roomId);
        this.server.to(`room:${roomId}`).emit('room:game_end', results);
      }

      return { success: true, data: result };
    } catch (err: any) {
      this.logger.error(`Error recording finish: ${err.message}`);
      return { success: false, error: 'Failed to record result' };
    }
  }

  private resolveCharacterState(accuracy: number, combo: number, wpm: number): CharacterState {
    if (combo >= 20 && accuracy >= 95) return 'boosting';
    if (accuracy < 70) return 'stumbling';
    if (wpm === 0)     return 'idle';
    return 'running';
  }

  private calculateScore(wpm: number, accuracy: number, combo: number): number {
    const base      = Math.round(wpm * (accuracy / 100) * 10);
    const comboMult = Math.min(2.0, 1 + combo * 0.02);
    return Math.round(base * comboMult);
  }
}
