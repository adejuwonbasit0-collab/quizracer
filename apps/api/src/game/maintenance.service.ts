import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GameMaintenanceService {
  private readonly logger = new Logger(GameMaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Stale WAITING rooms older than 2 hours → CANCELLED ────────
  @Cron(CronExpression.EVERY_HOUR)
  async cleanStaleWaitingRooms(): Promise<void> {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await this.prisma.room.updateMany({
      where: {
        status:    'WAITING',
        createdAt: { lt: cutoff },
      },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });
    if (result.count > 0) {
      this.logger.log(`Cleaned ${result.count} stale WAITING rooms`);
    }
  }

  // ── Stale ACTIVE races older than 30 minutes → FINISHED ───────
  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanStaleActiveRaces(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await this.prisma.room.findMany({
      where: {
        status:    'ACTIVE',
        startedAt: { lt: cutoff },
      },
      select: { id: true },
    });

    for (const room of stale) {
      await this.prisma.room.update({
        where: { id: room.id },
        data:  { status: 'FINISHED', finishedAt: new Date() },
      });
      // Clean up Redis state
      await Promise.all([
        this.redis.del(`game_text:${room.id}`),
        this.redis.del(`race_ended:${room.id}`),
        this.redis.del(`countdown:${room.id}`),
        this.redis.delPattern(`game_state:${room.id}:*`),
        this.redis.delPattern(`quiz_answer:${room.id}:*`),
        this.redis.delPattern(`quiz_state:${room.id}`),
      ]);
    }

    if (stale.length > 0) {
      this.logger.log(`Force-finished ${stale.length} stale ACTIVE races`);
    }
  }

  // ── Clean up expired anti-cheat WPM sample keys ───────────────
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanAntiCheatKeys(): Promise<void> {
    const deleted = await this.redis.delPattern('anticheat:wpm_samples:*');
    if (deleted > 0) {
      this.logger.log(`Cleaned ${deleted} anti-cheat sample keys`);
    }
  }

  // ── Clean up stale socket_room keys for offline users ─────────
  @Cron(CronExpression.EVERY_HOUR)
  async cleanStaleSocketRoomKeys(): Promise<void> {
    const keys = await this.redis.getClient().keys('socket_room:*');
    let cleaned = 0;
    for (const key of keys) {
      const userId = key.replace('socket_room:', '');
      const isOnline = await this.redis.exists(`online:user:${userId}`);
      if (!isOnline) {
        await this.redis.del(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.log(`Cleaned ${cleaned} stale socket_room keys`);
    }
  }

  // ── Refresh leaderboard daily stats snapshot ──────────────────
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async archiveDailyRankings(): Promise<void> {
    // Typecast selection configuration block to 'any' to split up recursive TS2615 compiler chains
    const topPlayers = await (this.prisma.raceSession as any).groupBy({
      by: ['userId'],
      _avg: { wpm: true, accuracy: true },
      _sum:  { isWin: true },
      _count: { id: true },
      where: { wpm: { gt: 0 } },
      orderBy: { _avg: { wpm: 'desc' } },
      take: 1000,
    } as any);

    // Upsert ranking_entries for all_time period
    for (let i = 0; i < topPlayers.length; i++) {
      const p = topPlayers[i];
      await this.prisma.rankingEntry.upsert({
        where: { userId_period_mode: { userId: p.userId, period: 'all_time', mode: 'overall' } },
        create: {
          userId:   p.userId,
          period:   'all_time',
          mode:     'overall',
          wpm:      p._avg.wpm ?? 0,
          accuracy: p._avg.accuracy ?? 0,
          wins:     Number(p._sum.isWin ?? 0),
          score:    Math.round((p._avg.wpm ?? 0) * 10),
          rank:     i + 1,
        },
        update: {
          wpm:      p._avg.wpm ?? 0,
          accuracy: p._avg.accuracy ?? 0,
          wins:     Number(p._sum.isWin ?? 0),
          score:    Math.round((p._avg.wpm ?? 0) * 10),
          rank:     i + 1,
        },
      });
    }
    this.logger.log(`Daily ranking snapshot: ${topPlayers.length} entries`);
  }
}
