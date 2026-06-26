import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async getQuestions(opts: { subject?: string; difficulty?: string; page?: number; limit?: number }) {
    const where: any = { isActive: true };
    if (opts.subject) where.subject = opts.subject;
    if (opts.difficulty) where.difficulty = opts.difficulty;
    const skip = ((opts.page || 1) - 1) * (opts.limit || 20);
    const [items, total] = await Promise.all([
      this.prisma.question.findMany({ where, skip, take: opts.limit || 20, orderBy: { createdAt: 'desc' } }),
      this.prisma.question.count({ where })
    ]);
    return { items, total, page: opts.page || 1, limit: opts.limit || 20 };
  }

  async createQuestion(dto: any, userId?: string) {
    return this.prisma.question.create({
      data: { ...dto, options: JSON.stringify(dto.options), createdBy: userId }
    });
  }

  async updateQuestion(id: string, dto: any) {
    return this.prisma.question.update({
      where: { id },
      data: { ...dto, options: dto.options ? JSON.stringify(dto.options) : undefined }
    });
  }

  async submitAnswer(roomId: string, userId: string, payload: { questionId: string; selectedIndex: number }) {
    const question = await this.prisma.question.findUnique({ where: { id: payload.questionId } });
    if (!question) throw new Error('Question not found');
    const isCorrect = question.correctIndex === payload.selectedIndex;
    await this.prisma.quizAttempt.create({
      data: {
        userId,
        questionId: payload.questionId,
        selectedIndex: payload.selectedIndex,
        isCorrect,
        timeMs: 0
      }
    });
    return { isCorrect, correctIndex: question.correctIndex };
  }

  async getRevealData(questionId: string) {
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    if (!question) throw new Error('Question not found');
    return { correctIndex: question.correctIndex, explanation: question.explanation };
  }

  async advanceQuestion(roomId: string) {
    return { questionId: 'next' };
  }

  async getQuizState(roomId: string) {
    return { roomId, status: 'active', currentQuestion: 0 };
  }

  async endQuiz(roomId: string) {
    const results = await this.prisma.quizAttempt.findMany({
      where: { userId: roomId },
      include: { question: true }
    });
    return results;
  }

  // Additional methods for game.gateway
  processAnswer(code: string, userId: string, optionIndex: number, questionId: string) {
    return this.submitAnswer(code, userId, { questionId, selectedIndex: optionIndex });
  }

  async fetchForRoom(count: number, difficulty: string) {
    const questions = await this.prisma.question.findMany({
      where: { difficulty, isActive: true },
      take: count,
      orderBy: { timesUsed: 'asc' }
    });
    return questions;
  }

  initSession(code: string, questions: any[], timePerRound: number, participants: string[]) {
    // For simplicity, just store in memory (we'll use a Map)
    if (!this.sessions) this.sessions = new Map();
    this.sessions.set(code, { questions, timePerRound, participants, current: 0 });
  }

  getSession(code: string) {
    return this.sessions?.get(code);
  }

  finalizeSession(code: string, participants: any[]) {
    const session = this.sessions?.get(code);
    if (!session) return [];
    const results = participants.map(p => ({
      userId: p.userId,
      score: Math.floor(Math.random() * 100), // placeholder
    }));
    this.sessions?.delete(code);
    return results;
  }

  clearSession(code: string) {
    this.sessions?.delete(code);
  }

  private sessions: Map<string, any>;
}


