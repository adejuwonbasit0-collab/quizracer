import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: { name?: string; mode?: string; isPrivate?: boolean; maxPlayers?: number }) {
    const code = nanoid(6);
    const room = await this.prisma.room.create({
      data: {
        code,
        name: dto.name || `Room ${code}`,
        mode: dto.mode || 'TYPING_RACE',
        hostId: userId,
        isPrivate: dto.isPrivate || false,
        status: 'WAITING',
        maxPlayers: dto.maxPlayers || 6,
        participants: {
          create: { userId, isHost: true, isReady: true }
        }
      },
      include: { participants: { include: { user: true } } }
    });
    return room;
  }

  async join(code: string, userId: string) {
    const room = await this.prisma.room.findFirst({ where: { code }, include: { participants: true } });
    if (!room) throw new NotFoundException('Room not found');
    const existing = room.participants.find(p => p.userId === userId);
    if (existing) {
      if (existing.leftAt) {
        await this.prisma.roomParticipant.update({
          where: { id: existing.id },
          data: { leftAt: null, isReady: false }
        });
      }
      return this.findById(room.id);
    }
    await this.prisma.roomParticipant.create({
      data: { roomId: room.id, userId, isReady: false }
    });
    return this.findById(room.id);
  }

  async leave(roomId: string, userId: string) {
    await this.prisma.roomParticipant.updateMany({
      where: { roomId, userId },
      data: { leftAt: new Date() }
    });
    const remaining = await this.prisma.roomParticipant.count({ where: { roomId, leftAt: null } });
    if (remaining === 0) {
      await this.prisma.room.delete({ where: { id: roomId } });
    }
  }

  async findById(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: { where: { leftAt: null }, include: { user: true } } }
    });
  }

  async findByCode(code: string) {
    const room = await this.prisma.room.findFirst({ where: { code }, include: { participants: { where: { leftAt: null }, include: { user: true } } } });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async findByIdSafe(roomId: string) {
    const room = await this.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async toggleReady(roomId: string, userId: string) {
    const p = await this.prisma.roomParticipant.findFirst({ where: { roomId, userId, leftAt: null } });
    if (!p) throw new NotFoundException('Participant not found');
    const updated = await this.prisma.roomParticipant.update({
      where: { id: p.id },
      data: { isReady: !p.isReady }
    });
    return updated.isReady;
  }

  async setReady(roomId: string, userId: string, ready: boolean) {
    await this.prisma.roomParticipant.updateMany({
      where: { roomId, userId, leftAt: null },
      data: { isReady: ready }
    });
  }

  async canStart(roomId: string): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: { where: { leftAt: null } } }
    });
    if (!room) return false;
    const players = room.participants.filter(p => !p.isSpectator);
    return players.length >= 2 && players.every(p => p.isReady);
  }

  async kick(roomId: string, hostId: string, targetUserId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.hostId !== hostId) throw new Error('Only host can kick');
    await this.prisma.roomParticipant.updateMany({
      where: { roomId, userId: targetUserId },
      data: { leftAt: new Date() }
    });
  }

  async spectate(code: string, userId: string) {
    const room = await this.prisma.room.findFirst({ where: { code } });
    if (!room) throw new NotFoundException('Room not found');
    await this.prisma.roomParticipant.create({
      data: { roomId: room.id, userId, isSpectator: true, isReady: true }
    });
    return this.findById(room.id);
  }

  async setStatus(roomId: string, status: string) {
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status }
    });
  }

  async updateStatus(roomId: string, status: string) {
    await this.setStatus(roomId, status);
  }

  async buildInitialGameState(roomId: string) {
    const room = await this.findById(roomId);
    return {
      roomId,
      participants: room.participants.map(p => ({
        userId: p.userId,
        username: p.user.username,
        isReady: p.isReady,
        isHost: p.isHost,
        progress: 0
      }))
    };
  }

  async getRoomMode(roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: roomId }, select: { mode: true } });
    return room?.mode || 'TYPING_RACE';
  }

  async getPublicRooms(mode?: string) {
    const where: any = { isPrivate: false, status: 'WAITING' };
    if (mode) where.mode = mode;
    return this.prisma.room.findMany({ where, include: { participants: { where: { leftAt: null } } }, orderBy: { createdAt: 'desc' } });
  }

  async addParticipant(roomId: string, userId: string, socketId: string, isHost: boolean) {
    const existing = await this.prisma.roomParticipant.findFirst({ where: { roomId, userId } });
    if (existing) {
      if (existing.leftAt) {
        await this.prisma.roomParticipant.update({
          where: { id: existing.id },
          data: { leftAt: null, socketId, isHost, isReady: false }
        });
      }
    } else {
      await this.prisma.roomParticipant.create({
        data: { roomId, userId, socketId, isHost, isReady: false }
      });
    }
  }

  async removeParticipant(roomId: string, userId: string) {
    await this.prisma.roomParticipant.updateMany({
      where: { roomId, userId },
      data: { leftAt: new Date() }
    });
  }
}


