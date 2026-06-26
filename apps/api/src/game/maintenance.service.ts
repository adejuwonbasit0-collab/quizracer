import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async updateRankings() {
    const topPlayers = await this.prisma.raceSession.groupBy({
      by: ['userId'],
      _avg: { wpm: true },
      _count: { userId: true },
      orderBy: { _avg: { wpm: 'desc' } },
      take: 1000
    });
    for (const item of topPlayers) {
      await this.prisma.rankingEntry.upsert({
        where: { userId: item.userId },
        update: { rating: Math.floor(item._avg.wpm || 1000), gamesPlayed: item._count.userId },
        create: { userId: item.userId, rating: Math.floor(item._avg.wpm || 1000), gamesPlayed: item._count.userId }
      });
    }
  }
}


