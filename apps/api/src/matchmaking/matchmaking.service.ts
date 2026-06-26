import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../game/rooms/rooms.service';

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private queue: { userId: string; mode: string; rated: boolean }[] = [];

  constructor(private prisma: PrismaService, private rooms: RoomsService) {}

  @Cron('*/5 * * * * *')
  async processQueue() {
    if (this.queue.length < 2) return;
    const ROOM_SIZE = 4;
    const players = this.queue.splice(0, ROOM_SIZE);
    const mode = players[0].mode;
    const hostId = players[0].userId;
    const room = await this.rooms.create(hostId, {
      name: '⚡ Ranked Match',
      mode,
      isPrivate: true,
      maxPlayers: ROOM_SIZE,
    });
    for (let i = 1; i < players.length; i++) {
      await this.rooms.join(room.code, players[i].userId);
    }
    this.logger.log(`Matchmaking: created room ${room.code} with ${players.length} players`);
  }

  async addToQueue(userId: string, mode: string, rated: boolean) {
    const existing = this.queue.find(p => p.userId === userId);
    if (existing) return;
    this.queue.push({ userId, mode, rated });
    this.logger.log(`User ${userId} added to queue (${mode})`);
  }

  async removeFromQueue(userId: string) {
    const idx = this.queue.findIndex(p => p.userId === userId);
    if (idx > -1) this.queue.splice(idx, 1);
  }
}