import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ReconnectState {
  roomId:      string;
  roomCode:    string;
  roomStatus:  string;
  gamePhase:   string | null;
  gameState:   unknown | null;
  participants: Array<{ userId: string; username: string; isReady: boolean }>;
  startedAt:   number | null;
}

@Injectable()
export class ReconnectService {
  private readonly logger = new Logger(ReconnectService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** Save disconnect timestamp for grace-period detection */
  async markDisconnected(userId: string, roomId: string): Promise<void> {
    await this.redis.set(
      `disconnect:${userId}:${roomId}`,
      { userId, roomId, at: Date.now() },
      60, // 60s grace window
    );
    this.logger.debug(`User ${userId} marked disconnected from room ${roomId}`);
  }

  /** Remove disconnect marker when user reconnects cleanly */
  async markReconnected(userId: string, roomId: string): Promise<void> {
    await this.redis.del(`disconnect:${userId}:${roomId}`);
    this.logger.debug(`User ${userId} reconnected to room ${roomId}`);
  }

  /** Returns true if the user disconnected recently (within grace window) */
  async wasRecentlyDisconnected(userId: string, roomId: string): Promise<boolean> {
    return this.redis.exists(`disconnect:${userId}:${roomId}`);
  }

  /** Build the full state needed to resync a reconnecting client */
  async buildReconnectState(userId: string, roomId: string): Promise<ReconnectState | null> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { leftAt: null },
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });

    if (!room) return null;

    // Check user is still a participant
    const isParticipant = room.participants.some((p: any) => p.userId === userId);
    if (!isParticipant) return null;

    // Fetch live game state from Redis
    let gameState: unknown = null;
    let gamePhase: string | null = null;

    if (room.status === 'ACTIVE' || room.status === 'COUNTDOWN') {
      // Typing game â€” get text and progress (only if ACTIVE)
      const textData = room.status === 'ACTIVE'
        ? await this.redis.get(`game_text:${roomId}`)
        : null;
      if (textData) {
        gameState = textData;
        gamePhase = 'active';
      }

      // Quiz game â€” get current question state
      const quizState = await this.redis.get(`quiz_state:${roomId}`);
      if (quizState) {
        // Don't send correctIndex to client
        const { questions, currentIndex, questionStartedAt, timePerRound, scores } =
          quizState as any;
        const currentQ = questions?.[currentIndex];
        gameState = {
          currentQuestion: currentIndex,
          totalQuestions:  questions?.length ?? 0,
          question:        currentQ
            ? { id: currentQ.id, text: currentQ.text, options: currentQ.options,
                subject: currentQ.subject, difficulty: currentQ.difficulty, imageUrl: currentQ.imageUrl }
            : null,
          questionStartedAt,
          timePerRound,
          scores: scores ?? {},
        };
        gamePhase = 'active';
      }

      // Countdown state
      const countdown = await this.redis.get<{ startTs: number; seconds: number }>(
        `countdown:${roomId}`,
      );
      if (countdown) {
        const elapsed  = Date.now() - countdown.startTs;
        const remaining = Math.max(0, countdown.seconds - Math.floor(elapsed / 1000));
        gameState = { countdown: remaining };
        gamePhase = 'countdown';
      }
    }

    return {
      roomId:      room.id,
      roomCode:    room.code,
      roomStatus:  room.status,
      gamePhase,
      gameState,
      startedAt:   room.startedAt?.getTime() ?? null,
      participants: room.participants.map((p: any) => ({
        userId:   p.userId,
        username: p.user.username,
        isReady:  p.isReady,
      })),
    };
  }
}


