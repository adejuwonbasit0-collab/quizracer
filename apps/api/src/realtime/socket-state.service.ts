import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const ONLINE_SET_KEY = 'online:users';
const ONLINE_TTL_SEC = 90; // heartbeat must refresh within 90s

/**
 * Tracks userId â†” socketId mappings within this process.
 * Cross-process presence is tracked via Redis SADD/SREM on `online:users`.
 */
@Injectable()
export class SocketStateService {
  private readonly userToSocket = new Map<string, string>();
  private readonly socketToUser = new Map<string, string>();

  constructor(private readonly redis: RedisService) {}

  register(userId: string, socketId: string): void {
    this.userToSocket.set(userId, socketId);
    this.socketToUser.set(socketId, userId);
    // Mark online in Redis (cross-process visibility)
    this.redis.sadd(ONLINE_SET_KEY, userId).catch(() => {});
    this.redis.set(`online:user:${userId}`, 1, ONLINE_TTL_SEC).catch(() => {});
  }

  unregister(userId: string): void {
    const socketId = this.userToSocket.get(userId);
    if (socketId) this.socketToUser.delete(socketId);
    this.userToSocket.delete(userId);
    this.redis.srem(ONLINE_SET_KEY, userId).catch(() => {});
    this.redis.del(`online:user:${userId}`).catch(() => {});
  }

  getSocketId(userId: string): string | undefined {
    return this.userToSocket.get(userId);
  }

  getUserId(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  isConnected(userId: string): boolean {
    return this.userToSocket.has(userId);
  }

  /** Local process count */
  getConnectedCount(): number {
    return this.userToSocket.size;
  }

  /** Cross-process count via Redis */
  async getOnlineCount(): Promise<number> {
    return this.redis.scard(ONLINE_SET_KEY);
  }

  async getOnlineUserIds(): Promise<string[]> {
    return this.redis.smembers(ONLINE_SET_KEY);
  }

  async refreshHeartbeat(userId: string): Promise<void> {
    await this.redis.set(`online:user:${userId}`, 1, ONLINE_TTL_SEC);
  }
}


