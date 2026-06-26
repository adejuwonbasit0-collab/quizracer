import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GameMode } from '@quizracer/shared-types';

interface RewardInput {
  wpm: number;
  accuracy: number;
  rank: number;
  totalPlayers: number;
  mode: GameMode;
}

interface RewardOutput {
  coinsEarned: number;
  xpEarned: number;
}

// XP required to reach each level — doubles roughly every 10 levels
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.15, level - 1));
}

// ELO K-factor based on games played
function kFactor(gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40;
  if (gamesPlayed < 100) return 20;
  return 10;
}

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  calculateRewards(input: RewardInput): RewardOutput {
    const { wpm, accuracy, rank, totalPlayers, mode } = input;

    // Base coins: WPM × accuracy multiplier
    const accMult = Math.max(0.1, accuracy / 100);
    const baseCoins = Math.round(wpm * accMult * 2);

    // Rank bonus
    const rankBonus = Math.max(0, totalPlayers - rank + 1) * 15;

    // Win bonus
    const winBonus = rank === 1 ? 50 : 0;

    // Mode multiplier
    const modeMult: Record<string, number> = {
      TOURNAMENT: 2.0,
      DAILY_CHALLENGE: 1.5,
      TYPING_RACE: 1.0,
      QUIZ_RACE: 1.0,
      MIXED_MODE: 1.2,
      PRACTICE: 0.3,
    };

    const coins = Math.round((baseCoins + rankBonus + winBonus) * (modeMult[mode] ?? 1));
    const xp    = Math.round(coins * 1.5); // XP scales with coins

    return { coinsEarned: Math.max(1, coins), xpEarned: Math.max(5, xp) };
  }

  async applyRewards(
    userId: string,
    coins: number,
    xp: number,
    mode: GameMode,
    isWin: boolean,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, xp: true, xpToNextLevel: true, coins: true, rating: true },
    });

    if (!user) return;

    let newXp    = user.xp + xp;
    let newLevel = user.level;
    let newXpToNext = user.xpToNextLevel;

    // Level up loop
    while (newXp >= newXpToNext) {
      newXp -= newXpToNext;
      newLevel++;
      newXpToNext = xpForLevel(newLevel + 1);

      this.logger.debug(`User ${userId} leveled up to ${newLevel}`);
      this.events.emit('user.level_up', { userId, newLevel });
    }

    // Update stats
    await this.prisma.runTransaction(async (tx: any) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          coins: { increment: coins },
          xp:    newXp,
          level: newLevel,
          xpToNextLevel: newXpToNext,
          rank: this.rankForLevel(newLevel),
        },
      });

      await tx.userStats.update({
        where: { userId },
        data: {
          totalGames: { increment: 1 },
          totalWins:  { increment: isWin ? 1 : 0 },
          totalLosses: { increment: !isWin ? 1 : 0 },
        },
      }).catch(() => {}); // may not exist in edge cases

      await tx.xpEvent.create({
        data: { userId, amount: xp, reason: `${mode}_game` },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'REWARD',
          amount: coins,
          currency: 'coins',
          description: `Race reward - ${mode}`,
        },
      });
    });
  }

  async updateWpmStats(userId: string, wpm: number, accuracy: number): Promise<void> {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    if (!stats) return;

    const newBestWpm = Math.max(stats.bestWpm, Math.round(wpm));
    const n          = stats.totalGames || 1;
    const newAvgWpm  = (stats.avgWpm * (n - 1) + wpm) / n;
    const newAvgAcc  = (stats.avgAccuracy * (n - 1) + accuracy) / n;

    await this.prisma.userStats.update({
      where: { userId },
      data: {
        bestWpm:     newBestWpm,
        avgWpm:      Math.round(newAvgWpm * 10) / 10,
        avgAccuracy: Math.round(newAvgAcc * 10) / 10,
      },
    });
  }

  async updateEloRating(
    winnerId: string,
    loserId: string,
  ): Promise<void> {
    const [winner, loser] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: winnerId }, select: { id: true, rating: true } }),
      this.prisma.user.findUnique({ where: { id: loserId }, select: { id: true, rating: true } }),
    ]);

    if (!winner || !loser) return;

    const expectedWin  = 1 / (1 + Math.pow(10, (loser.rating - winner.rating) / 400));
    const expectedLoss = 1 - expectedWin;

    const [winnerStats, loserStats] = await Promise.all([
      this.prisma.userStats.findUnique({ where: { userId: winnerId }, select: { totalGames: true } }),
      this.prisma.userStats.findUnique({ where: { userId: loserId }, select: { totalGames: true } }),
    ]);

    const kWinner = kFactor(winnerStats?.totalGames ?? 0);
    const kLoser  = kFactor(loserStats?.totalGames ?? 0);

    const newWinnerRating = Math.round(winner.rating + kWinner * (1 - expectedWin));
    const newLoserRating  = Math.max(100, Math.round(loser.rating + kLoser * (0 - expectedLoss)));

    await Promise.all([
      this.prisma.user.update({ where: { id: winnerId }, data: { rating: newWinnerRating } }),
      this.prisma.user.update({ where: { id: loserId },  data: { rating: newLoserRating } }),
    ]);
  }

  private rankForLevel(level: number): string {
    if (level >= 50) return 'Grandmaster';
    if (level >= 40) return 'Master';
    if (level >= 30) return 'Diamond';
    if (level >= 20) return 'Platinum';
    if (level >= 15) return 'Gold';
    if (level >= 10) return 'Silver';
    if (level >= 5)  return 'Bronze';
    return 'Novice';
  }
}
