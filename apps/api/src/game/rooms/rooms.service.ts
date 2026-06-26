import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name:string; mode:string; isPrivate:boolean; maxPlayers:number; hostId:string; difficulty?:string; subject?:string }) {
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
}
