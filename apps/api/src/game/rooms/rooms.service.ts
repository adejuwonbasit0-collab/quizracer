import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dataOrHostId: any, dto?: any) {
    if (typeof dataOrHostId === 'string') { dataOrHostId = { name: dto?.name || 'Room', mode: dto?.mode || 'TYPING', isPrivate: dto?.isPrivate ?? false, maxPlayers: dto?.maxPlayers ?? 4, hostId: dataOrHostId, difficulty: dto?.difficulty, subject: dto?.subject }; }
    const data = dataOrHostId;
    const code = nanoid(6).toUpperCase();
    return this.prisma.room.create({
      data: { code, name:data.name, mode:data.mode, isPrivate:data.isPrivate, maxPlayers:data.maxPlayers, hostId:data.hostId, difficulty:data.difficulty??'medium', subject:data.subject, status:'WAITING' },
      include: { participants: { include: { user: { select: { id:true,username:true,displayName:true,avatar:true,level:true } } } } },
    });
  }

  async findByCode(code: string) {
    return this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { participants: { include: { user: { select: { id:true,username:true,displayName:true,avatar:true,level:true } } } } },
    });
  }

  async getPublicRooms(mode?: string) {
    return this.prisma.room.findMany({
      where: { isPrivate:false, status: { in: ['WAITING','ACTIVE'] }, ...(mode?{mode}:{}) },
      include: { _count: { select: { participants:true } } },
      orderBy: { createdAt:'desc' }, take: 20,
    });
  }

  async addParticipant(roomId:string, userId:string, socketId:string, isHost=false) {
    return this.prisma.roomParticipant.upsert({
      where: { roomId_userId: { roomId, userId } },
      create: { roomId, userId, socketId, isHost, isReady: isHost },
      update: { socketId },
    });
  }

  async removeParticipant(roomId:string, userId:string) {
    return this.prisma.roomParticipant.deleteMany({ where: { roomId, userId } });
  }

  async setReady(roomId:string, userId:string, isReady:boolean) {
    return this.prisma.roomParticipant.update({ where: { roomId_userId:{roomId,userId} }, data: { isReady } });
  }

  async updateStatus(roomId:string, status:string) {
    return this.prisma.room.update({ where: { id:roomId }, data: { status, ...(status==='ACTIVE'?{startedAt:new Date()}:{}), ...(status==='FINISHED'?{finishedAt:new Date()}:{}) } });
  }


  async join(code: string, userId: string) {
    const room = await this.findByCode(code);
    if (!room) throw new Error('Room not found');
    return this.addParticipant(room.id, userId, '');
  }
  async leave(roomId: string, userId: string) { return this.removeParticipant(roomId, userId); }
  async findByIdSafe(roomId: string) { return this.prisma.room.findUnique({ where: { id: roomId }, include: { participants: true } }); }
  async toggleReady(roomId: string, userId: string) {
    const room = await this.findByIdSafe(roomId);
    const participant = room?.participants.find(p => p.userId === userId);
    const nextReadyState = !participant?.isReady;
    await this.setReady(roomId, userId, nextReadyState);
    return nextReadyState;
  }
  async canStart(roomId: string): Promise<boolean> {
    const room = await this.findByIdSafe(roomId);
    if (!room || room.participants.length < 1) return false;
    return room.participants.every(p => p.isReady);
  }
  async kick(roomId: string, hostId: string, targetUserId: string) {
    const room = await this.findByIdSafe(roomId);
    if (room?.hostId !== hostId) throw new Error('Unauthorized');
    return this.removeParticipant(roomId, targetUserId);
  }
  async spectate(code: string, userId: string) { return this.findByCode(code); }
  async setStatus(roomId: string, status: string) { return this.updateStatus(roomId, status); }
  async getRoomMode(roomId: string): Promise<string> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    return room?.mode || 'TYPING';
  }
  async buildInitialGameState(roomId: string) {
    const room = await this.findByIdSafe(roomId);
    return { roomId, status: 'ACTIVE', mode: room?.mode || 'TYPING', players: room?.participants.map(p => ({ userId: p.userId, progress: 0 })) || [] };
  }
}

