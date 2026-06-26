import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

export const REDIS_PUB_CLIENT = 'REDIS_PUB_CLIENT';
export const REDIS_SUB_CLIENT = 'REDIS_SUB_CLIENT';

// TTL constants (seconds)
export const TTL = {
  MINUTE: 60,
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  HOUR: 3600,
  SIX_HOURS: 21600,
  DAY: 86400,
  WEEK: 604800,
} as const;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private pubClient!: Redis;
  private subClient!: Redis;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    const options = {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 100, 5000),
      enableReadyCheck: true,
      keepAlive: 30000,
    };

    this.client    = new Redis(this.config.redisUrl, options);
    this.pubClient = new Redis(this.config.redisUrl, options);
    this.subClient = new Redis(this.config.redisUrl, options);

    const setupClient = async (redis: Redis, name: string) => {
      redis.on('error', (err) => this.logger.error(`Redis ${name} error: ${err.message}`));
      redis.on('connect', () => this.logger.log(`Redis ${name} connected`));
      redis.on('reconnecting', () => this.logger.warn(`Redis ${name} reconnecting`));
      await redis.connect();
    };

    await Promise.all([
      setupClient(this.client, 'main'),
      setupClient(this.pubClient, 'pub'),
      setupClient(this.subClient, 'sub'),
    ]);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.client.quit(),
      this.pubClient.quit(),
      this.subClient.quit(),
    ]);
    this.logger.log('Redis connections closed');
  }

  getClient(): Redis {
    return this.client;
  }

  getPubClient(): Redis {
    return this.pubClient;
  }

  getSubClient(): Redis {
    return this.subClient;
  }

  // ── Cache helpers ─────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err: any) {
      this.logger.warn(`Redis GET failed: ${key} — ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET failed: ${key} — ${err.message}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      if (keys.length) await this.client.del(...keys);
    } catch (err: any) {
      this.logger.warn(`Redis DEL failed — ${err.message}`);
    }
  }

  async delPattern(pattern: string): Promise<number> {
    try {
      let cursor = '0';
      let deleted = 0;
      // Use SCAN instead of KEYS to avoid blocking Redis in production
      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
        cursor = nextCursor;
        if (keys.length) {
          await this.client.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== '0');
      return deleted;
    } catch (err: any) {
      this.logger.warn(`Redis DEL pattern failed: ${pattern} — ${err.message}`);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  // ── Hash helpers ──────────────────────────────────────────

  async hset(key: string, field: string, value: unknown): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value));
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const raw = await this.client.hget(key, field);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    const raw = await this.client.hgetall(key);
    if (!raw || !Object.keys(raw).length) return null;
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(raw)) {
      try { result[k] = JSON.parse(v) as T; } catch { result[k] = v as unknown as T; }
    }
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<void> {
    if (fields.length) await this.client.hdel(key, ...fields);
  }

  // ── Sorted set helpers (leaderboard) ─────────────────────

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zrange(key: string, start: number, stop: number, withScores = false) {
    if (withScores) {
      return this.client.zrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number, withScores = false) {
    if (withScores) {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async zrank(key: string, member: string): Promise<number | null> {
    return this.client.zrank(key, member);
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    return this.client.zrevrank(key, member);
  }

  async zscore(key: string, member: string): Promise<string | null> {
    return this.client.zscore(key, member);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  // ── Set helpers (matchmaking) ─────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<void> {
    await this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    await this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  // ── List helpers ──────────────────────────────────────────

  async lpush(key: string, ...values: string[]): Promise<void> {
    await this.client.lpush(key, ...values);
  }

  async rpop(key: string): Promise<string | null> {
    return this.client.rpop(key);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  // ── Publish helper ────────────────────────────────────────

  async publish(channel: string, message: unknown): Promise<void> {
    await this.pubClient.publish(channel, JSON.stringify(message));
  }

  // ── Atomic lock helper ────────────────────────────────────
  /**
   * Atomically acquire a lock (SET NX EX).
   * Returns true if the lock was acquired, false if it already exists.
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.set(key, '1', 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err: any) {
      this.logger.warn(`Redis acquireLock failed: ${key} — ${err.message}`);
      return false;
    }
  }

  /** Atomic INCR — safe for counters shared across requests */
  async atomicIncr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const val = await this.client.incr(key);
      if (ttlSeconds && val === 1) {
        // Only set TTL on first increment (avoids resetting expiry)
        await this.client.expire(key, ttlSeconds);
      }
      return val;
    } catch (err: any) {
      this.logger.warn(`Redis atomicIncr failed: ${key} — ${err.message}`);
      return 0;
    }
  }
}
