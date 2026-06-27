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

  // ─────────────────────────────────────────────
  // EVENT TRACKING
  // ─────────────────────────────────────────────

  async trackEvent(
    event: string,
    userId?: string,
    sessionId?: string,
    properties?: Record<string, unknown>,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.prisma.gameEvent.create({
        data: { event, userId, sessionId, properties: properties ? JSON.stringify(properties) : null, ipAddress },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to track event ${event}: ${err.message}`);
    }
  }

  @OnEvent('game.ended')
  async onGameEnded(payload: { roomId: string; mode: string; results: unknown[] }) {
    await this.trackEvent('game_ended', undefined, payload.roomId, {
      mode: payload.mode,
      playerCount: payload.results.length,
    });
  }

  // ─────────────────────────────────────────────
  // ANALYTICS QUERIES
  // ─────────────────────────────────────────────

  async getRetentionStats(days = 30) {
    const cacheKey = `analytics:retention:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - days * 86400000);
    const data = await this.prisma.$queryRaw<
      Array<{ date: string; new_users: number; returning_users: number }>
    >`
      SELECT
        DATE("lastLoginAt")::text AS date,
        COUNT(CASE WHEN "createdAt" >= ${since} THEN 1 END)::int AS new_users,
        COUNT(CASE WHEN "createdAt" < ${since} THEN 1 END)::int AS returning_users
      FROM users
      WHERE "lastLoginAt" >= ${since}
      GROUP BY DATE("lastLoginAt")
      ORDER BY date ASC
    `;

    await this.redis.set(cacheKey, data, TTL.HOUR);
    return data;
  }

  async getGameModeDistribution(days = 30) {
    const cacheKey = `analytics:modes:${days}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - days * 86400000);
    const data = await this.prisma.raceSession.groupBy({
      by: ['mode'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      _avg: { wpm: true, accuracy: true },
    });

    await this.redis.set(cacheKey, data, TTL.HOUR);
    return data;
  }

  async getTopPlayers(limit = 10) {
    const cacheKey = `analytics:top_players:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.userStats.findMany({
      where: { bestWpm: { gt: 0 } },
      orderBy: { bestWpm: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true, level: true } },
      },
    });

    await this.redis.set(cacheKey, data, TTL.FIFTEEN_MINUTES);
    return data;
  }

  async getWpmDistribution() {
    const cacheKey = 'analytics:wpm_distribution';
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const data = await this.prisma.$queryRaw<Array<{ bucket: string; count: number }>>`
      SELECT
        CASE
          WHEN wpm < 30  THEN '0-29'
          WHEN wpm < 60  THEN '30-59'
          WHEN wpm < 100 THEN '60-99'
          WHEN wpm < 140 THEN '100-139'
          WHEN wpm < 200 THEN '140-199'
          ELSE '200+'
        END AS bucket,
        COUNT(*)::int AS count
      FROM race_sessions
      WHERE wpm > 0
      GROUP BY bucket
      ORDER BY bucket
    `;

    await this.redis.set(cacheKey, data, TTL.HOUR);
    return data;
  }

  async getRevenueMetrics(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const data = await this.prisma.$queryRaw<
      Array<{ date: string; revenue: number; transactions: number }>
    >`
      SELECT
        DATE("createdAt")::text AS date,
        SUM(amount)::float AS revenue,
        COUNT(*)::int AS transactions
      FROM transactions
      WHERE type = 'PURCHASE'
        AND currency = 'USD'
        AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;
    return data;
  }

  // ─────────────────────────────────────────────
  // SCHEDULED: Build daily stats snapshot
  // ─────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async buildDailySnapshot(): Promise<void> {
    this.logger.log('Building daily stats snapshot...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const dayEnd = new Date(yesterday.getTime() + 86400000);

    const [activeUsers, newUsers, gamesPlayed, avgWpmResult] = await Promise.all([
      this.prisma.user.count({ where: { lastActiveAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.user.count({ where: { createdAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.raceSession.count({ where: { createdAt: { gte: yesterday, lt: dayEnd } } }),
      this.prisma.raceSession.aggregate({
        where: { createdAt: { gte: yesterday, lt: dayEnd }, wpm: { gt: 0 } },
        _avg: { wpm: true },
      }),
    ]);

    await this.prisma.dailyStats.upsert({
      where: { date: yesterday },
      create: { date: yesterday, activeUsers, metrics: JSON.stringify({ newUsers, gamesPlayed, avgWpm: avgWpmResult._avg.wpm ?? 0 }) },
      update: {
        activeUsers, metrics: JSON.stringify({ newUsers, gamesPlayed, avgWpm: avgWpmResult._avg.wpm ?? 0 }) },
    });

    this.logger.log(`Daily snapshot: ${activeUsers} active, ${gamesPlayed} games`);
  }
}



