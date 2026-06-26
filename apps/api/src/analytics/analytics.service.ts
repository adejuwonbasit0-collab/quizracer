import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, TTL } from '../redis/redis.service';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async trackEvent(event: string, userId?: string, sessionId?: string, properties?: Record<string, unknown>, ipAddress?: string) {
    try {
      await this.prisma.gameEvent.create({
        data: { userId, type: event, data: JSON.stringify({ sessionId, properties, ipAddress }) },
      });
    } catch (err) {
      this.logger.warn(`Failed to track event ${event}: ${err.message}`);
    }
  }

  @OnEvent('game.ended')
  async onGameEnded(payload: { roomId: string; mode: string; results: unknown[] }) {
    await this.trackEvent('game_ended', undefined, payload.roomId, { mode: payload.mode, playerCount: payload.results.length });
  }

  async getRetentionStats(days = 30) {
    const cacheKey = `analytics:retention:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;
    const since = new Date(Date.now() - days * 86400000);
    const data = await this.prisma.$queryRaw<Array<{ date: string; new_users: number; returning_users: number }>>`
      SELECT DATE("lastLoginAt") AS date,
             COUNT(CASE WHEN "createdAt" >= ${since} THEN 1 END) AS new_users,
             COUNT(CASE WHEN "createdAt" < ${since} THEN 1 END) AS returning_users
      FROM users
      WHERE "lastLoginAt" >= ${since}
      GROUP BY DATE("lastLoginAt")
      ORDER BY date ASC
    `;
    await this.redis.set(cacheKey, data, 3600);
    return data;
  }

  async getGameModeDistribution(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return this.prisma.raceSession.groupBy({
      by: ['mode'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _avg: { wpm: true, accuracy: true },
    });
  }

  async getTopPlayers(limit = 10) {
    return this.prisma.userStats.findMany({
      where: { bestWpm: { gt: 0 } },
      orderBy: { bestWpm: 'desc' },
      take: limit,
      include: { user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } } },
    });
  }

  async getWpmDistribution() {
    return this.prisma.$queryRaw<Array<{ bucket: string; count: number }>>`
      SELECT CASE
        WHEN wpm < 30  THEN '0-29'
        WHEN wpm < 60  THEN '30-59'
        WHEN wpm < 100 THEN '60-99'
        WHEN wpm < 140 THEN '100-139'
        WHEN wpm < 200 THEN '140-199'
        ELSE '200+'
      END AS bucket,
      COUNT(*) AS count
      FROM race_sessions
      WHERE wpm > 0
      GROUP BY bucket
      ORDER BY bucket
    `;
  }

  async getRevenueMetrics(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    return this.prisma.$queryRaw<Array<{ date: string; revenue: number; transactions: number }>>`
      SELECT DATE("createdAt") AS date,
             SUM(amount) AS revenue,
             COUNT(*) AS transactions
      FROM transactions
      WHERE type = 'PURCHASE' AND currency = 'USD' AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async buildDailySnapshot() {
    this.logger.log('Building daily stats snapshot...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0,0,0,0);
    const dayEnd = new Date(yesterday.getTime() + 86400000);
    const [activeUsers, newUsers, gamesPlayed, avgWpmResult] = await Promise.all([
      this.prisma.user.count({ where: { lastActiveAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.user.count({ where: { createdAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.raceSession.count({ where: { createdAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.raceSession.aggregate({ where: { createdAt: { gte: yesterday, lt: dayEnd }, wpm: { gt: 0 } }, _avg: { wpm: true } }),
    ]);
    await this.prisma.dailyStats.upsert({
      where: { date: yesterday },
      create: { date: yesterday, activeUsers, newUsers, totalRaces: gamesPlayed, avgWpm: avgWpmResult._avg.wpm ?? 0 },
      update: { activeUsers, newUsers, totalRaces: gamesPlayed, avgWpm: avgWpmResult._avg.wpm ?? 0 },
    });
  }
}


