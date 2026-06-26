import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents, ServerToClientEvents,
  InterServerEvents, SocketData, QuizAnswerPayload,
} from '@quizracer/shared-types';
import { RedisService, TTL } from '../../redis/redis.service';
import { QuizService } from '../../game/quiz/quiz.service';

type QRSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

@WebSocketGateway()
export class QuizGateway {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  private readonly logger = new Logger(QuizGateway.name);
  // Per-room question reveal timers (cleared when room ends)
  private readonly revealTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly redis: RedisService,
    private readonly quizService: QuizService,
  ) {}

  @SubscribeMessage('quiz:answer')
  async handleAnswer(
    @ConnectedSocket() socket: QRSocket,
    @MessageBody() payload: QuizAnswerPayload,
  ) {
    const { userId, roomId } = socket.data;
    if (!roomId) return { success: false, error: 'Not in a room' };

    // Idempotency: one answer per player per question
    const idempotencyKey = `quiz_answer:${roomId}:${payload.questionId}:${userId}`;
    const alreadyAnswered = await this.redis.exists(idempotencyKey);
    if (alreadyAnswered) return { success: false, error: 'Already answered' };

    try {
      const result = await this.quizService.submitAnswer(roomId, userId, payload);

      // Mark answered (TTL = round time + 30s buffer)
      await this.redis.set(idempotencyKey, true, TTL.MINUTE);

      // If everyone answered — reveal immediately, cancel pending timer
      if (result.allAnswered) {
        this.cancelRevealTimer(roomId);
        await this.revealAndAdvance(roomId, payload.questionId);
      }

      return { success: true, data: { correct: result.isCorrect, points: result.pointsEarned } };
    } catch (err: any) {
      this.logger.warn(`quiz:answer error room=${roomId} user=${userId}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ── Called by RoomGateway after game_start for quiz mode ──────

  async scheduleQuestionTimer(roomId: string, timePerRound: number, questionId: string): Promise<void> {
    this.cancelRevealTimer(roomId);
    const timer = setTimeout(async () => {
      this.revealTimers.delete(roomId);
      await this.revealAndAdvance(roomId, questionId);
    }, timePerRound * 1000);
    this.revealTimers.set(roomId, timer);
  }

  // ─────────────────────────────────────────────
  // REVEAL + ADVANCE
  // ─────────────────────────────────────────────

  async revealAndAdvance(roomId: string, questionId: string): Promise<void> {
    try {
      const { correctIndex, answers, scores } =
        await this.quizService.getRevealData(roomId, questionId);

      this.server.to(`room:${roomId}`).emit('quiz:answer_revealed', {
        correctIndex, answers, scores,
      });

      // 3-second pause so clients can show results
      await this.delay(3000);

      const next = await this.quizService.advanceToNextQuestion(roomId);

      if (next) {
        this.server.to(`room:${roomId}`).emit('quiz:new_question', {
          question:       next.question!,
          questionNumber: next.questionNumber,
          startedAt:      Date.now(),
        });

        // Schedule timer for the new question
        const state = await this.quizService.getQuizState(roomId);
        if (state) {
          await this.scheduleQuestionTimer(roomId, state.timePerRound, next.question!.id);
        }
      } else {
        // No more questions — end the game
        const results = await this.quizService.endQuiz(roomId);
        this.server.to(`room:${roomId}`).emit('room:game_end', results);
        this.clearRoom(roomId);
      }
    } catch (err: any) {
      this.logger.error(`revealAndAdvance failed room=${roomId}: ${err.message}`);
    }
  }

  clearRoom(roomId: string): void {
    this.cancelRevealTimer(roomId);
    // Clean up all idempotency keys for this room
    this.redis.delPattern(`quiz_answer:${roomId}:*`).catch(() => {});
  }

  private cancelRevealTimer(roomId: string): void {
    const timer = this.revealTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.revealTimers.delete(roomId);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}
