import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TypingService {
  constructor(private prisma: PrismaService) {}

  async getRandomText(difficulty: string = 'medium', category?: string) {
    const where: any = { difficulty, isActive: true };
    if (category) where.category = category;
    const texts = await this.prisma.typingText.findMany({
      where,
      take: 100,
      orderBy: { timesUsed: 'asc' }
    });
    if (texts.length === 0) {
      return { id: 'fallback', content: 'The quick brown fox jumps over the lazy dog.', wordCount: 9, charCount: 43 };
    }
    const idx = Math.floor(Math.random() * texts.length);
    return texts[idx];
  }

  async recordFinish(roomId: string, userId: string, payload: { wpm: number; accuracy: number; rank: number }) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: { where: { leftAt: null } } }
    });
    if (!room) throw new Error('Room not found');
    const totalPlayers = room.participants.filter(p => !p.isSpectator).length;
    const session = await this.prisma.raceSession.create({
      data: {
        roomId,
        userId,
        mode: room.mode,
        wpm: payload.wpm,
        accuracy: payload.accuracy,
        rank: payload.rank,
        score: this.calculateScore(payload.wpm, payload.accuracy, payload.rank, totalPlayers)
      }
    });
    return session;
  }

  private calculateScore(wpm: number, accuracy: number, rank: number, total: number): number {
    const base = wpm * accuracy / 100;
    const bonus = (total - rank + 1) * 10;
    return Math.floor(base + bonus);
  }

  async checkAllFinished(roomId: string): Promise<boolean> {
    const participants = await this.prisma.roomParticipant.count({
      where: { roomId, leftAt: null, isSpectator: false }
    });
    const finished = await this.prisma.raceSession.count({
      where: { roomId }
    });
    return finished >= participants;
  }

  async endRace(roomId: string) {
    const sessions = await this.prisma.raceSession.findMany({
      where: { roomId },
      orderBy: { rank: 'asc' }
    });
    return sessions;
  }

  async getFinishedCount(roomId: string): Promise<number> {
    return this.prisma.raceSession.count({ where: { roomId } });
  }

  detectCheat(wpm: number): boolean {
    return wpm > 250;
  }

  analyzeKeystrokes(keystrokes: any[]): { suspicious: boolean; reason?: string } {
    if (!keystrokes || keystrokes.length < 10) return { suspicious: false };
    const avgDuration = keystrokes.reduce((sum, k) => sum + (k.duration || 0), 0) / keystrokes.length;
    if (avgDuration < 20) return { suspicious: true, reason: 'Too fast keystrokes' };
    // Simple check: if all timestamps are too regular
    const diffs = [];
    for (let i = 1; i < keystrokes.length; i++) {
      diffs.push(keystrokes[i].timestamp - keystrokes[i-1].timestamp);
    }
    const avgDiff = diffs.reduce((a,b) => a+b, 0) / diffs.length;
    if (avgDiff < 30) return { suspicious: true, reason: 'Unnatural typing rhythm' };
    return { suspicious: false };
  }
}


