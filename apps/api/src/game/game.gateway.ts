import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RoomsService } from './rooms/rooms.service';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: '/',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private socketToUser = new Map<string, string>();
  private userToSocket = new Map<string, string>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      const userId = payload.sub;
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        client.disconnect();
        return;
      }
      this.socketToUser.set(client.id, userId);
      this.userToSocket.set(userId, client.id);
      client.join(`user:${userId}`);
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });
    } catch (e) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      const participant = await this.prisma.roomParticipant.findFirst({
        where: { userId },
        include: { room: true },
      });
      if (participant) {
        const roomId = participant.roomId;
        await this.roomsService.removeParticipant(roomId, userId);
        const room = await this.getFullRoom(roomId);
        if (room) {
          if (room.hostId === userId) {
            const next = room.participants.find(p => p.userId !== userId);
            if (next) {
              await this.prisma.room.update({
                where: { id: roomId },
                data: { hostId: next.userId },
              });
              await this.prisma.roomParticipant.update({
                where: { roomId_userId: { roomId, userId: next.userId } },
                data: { isHost: true },
              });
              this.server.to(`room:${roomId}`).emit('room:updated', await this.getFullRoom(roomId));
            } else {
              await this.roomsService.updateStatus(roomId, 'DISBANDED');
              this.server.to(`room:${roomId}`).emit('room:disbanded');
            }
          } else {
            this.server.to(`room:${roomId}`).emit('room:player_left', { userId });
            this.server.to(`room:${roomId}`).emit('room:updated', await this.getFullRoom(roomId));
          }
        }
      }
      this.socketToUser.delete(client.id);
      this.userToSocket.delete(userId);
    }
  }

  // Helper to fetch room with user details
  private async getFullRoom(roomId: string) {
    return this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
              },
            },
          },
        },
      },
    });
  }

  @SubscribeMessage('room:create')
  async handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { name: string; mode: string; isPrivate: boolean; maxPlayers: number },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };
    try {
      const room = await this.roomsService.create(
        userId,
        {
          name: data.name || 'Room',
          mode: data.mode || 'TYPING_RACE',
          isPrivate: data.isPrivate ?? false,
          maxPlayers: data.maxPlayers ?? 6,
        },
      );
      await this.roomsService.addParticipant(room.id, userId, client.id, true);
      client.join(`room:${room.id}`);
      const fullRoom = await this.getFullRoom(room.id);
      client.emit('room:updated', fullRoom);
      return { room: fullRoom };
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };
    try {
      const room = await this.roomsService.findByCode(data.code);
      if (!room) return { error: 'Room not found' };
      if (room.status !== 'WAITING') return { error: 'Room not joinable' };
      const existing = room.participants.find(p => p.userId === userId);
      if (existing) {
        const fullRoom = await this.getFullRoom(room.id);
        return { room: fullRoom };
      }
      if (room.participants.length >= room.maxPlayers) return { error: 'Room is full' };
      await this.roomsService.addParticipant(room.id, userId, client.id);
      client.join(`room:${room.id}`);
      const fullRoom = await this.getFullRoom(room.id);
      const participant = fullRoom.participants.find(p => p.userId === userId);
      this.server.to(`room:${room.id}`).emit('room:player_joined', {
        userId,
        username: participant?.user?.username,
        displayName: participant?.user?.displayName,
        avatar: participant?.user?.avatar,
        level: participant?.user?.level,
        isHost: false,
        isReady: false,
      });
      this.server.to(`room:${room.id}`).emit('room:updated', fullRoom);
      return { room: fullRoom };
    } catch (e) {
      return { error: e.message };
    }
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
      include: { room: true },
    });
    if (!participant) return { error: 'Not in a room' };
    const roomId = participant.roomId;
    await this.roomsService.removeParticipant(roomId, userId);
    client.leave(`room:${roomId}`);
    const room = await this.getFullRoom(roomId);
    if (room && room.hostId === userId) {
      const next = room.participants.find(p => p.userId !== userId);
      if (next) {
        await this.prisma.room.update({
          where: { id: roomId },
          data: { hostId: next.userId },
        });
        await this.prisma.roomParticipant.update({
          where: { roomId_userId: { roomId, userId: next.userId } },
          data: { isHost: true },
        });
        const updated = await this.getFullRoom(roomId);
        this.server.to(`room:${roomId}`).emit('room:updated', updated);
      } else {
        await this.roomsService.updateStatus(roomId, 'DISBANDED');
        this.server.to(`room:${roomId}`).emit('room:disbanded');
      }
    } else if (room) {
      this.server.to(`room:${roomId}`).emit('room:player_left', { userId });
      this.server.to(`room:${roomId}`).emit('room:updated', room);
    }
    return {};
  }

  @SubscribeMessage('room:ready')
  async handleReady(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
      include: { room: true },
    });
    if (!participant) return { error: 'Not in a room' };
    const newState = !participant.isReady;
    await this.roomsService.setReady(participant.roomId, userId, newState);
    this.server.to(`room:${participant.roomId}`).emit('room:player_ready', { userId, isReady: newState });
    const updatedRoom = await this.getFullRoom(participant.roomId);
    this.server.to(`room:${participant.roomId}`).emit('room:updated', updatedRoom);
    return { isReady: newState };
  }

  @SubscribeMessage('room:start')
  async handleStartGame(@ConnectedSocket() client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
      include: { room: true },
    });
    if (!participant) return { error: 'Not in a room' };
    const room = participant.room;
    if (room.hostId !== userId) return { error: 'Only host can start' };
    if (room.status !== 'WAITING') return { error: 'Room already started' };
    const participants = await this.prisma.roomParticipant.findMany({
      where: { roomId: room.id },
      include: { user: true },
    });
    if (participants.length < 2) return { error: 'Need at least 2 players' };
    await this.roomsService.updateStatus(room.id, 'ACTIVE');
    const texts = await this.prisma.typingText.findMany({
      where: { isActive: true },
      take: 1,
    });
    const text = texts[0] || { content: 'The quick brown fox jumps over the lazy dog.', id: 'default' };
    this.server.to(`room:${room.id}`).emit('room:game_start', {
      textContent: text.content,
      textId: text.id,
      startedAt: Date.now(),
    });
    const updatedRoom = await this.getFullRoom(room.id);
    this.server.to(`room:${room.id}`).emit('room:updated', updatedRoom);
    return { success: true };
  }

  @SubscribeMessage('typing:progress')
  async handleTypingProgress(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
      include: { user: true },
    });
    if (!participant) return;
    const roomId = participant.roomId;
    this.server.to(`room:${roomId}`).emit('typing:player_progress', {
      userId,
      username: participant.user?.username || 'Player',
      avatar: participant.user?.avatar || null,
      progress: data.progress,
      wpm: data.wpm,
      accuracy: data.accuracy,
      errors: data.errors,
      combo: data.combo,
      score: data.score,
      position: data.position,
      isFinished: data.isFinished,
      finishedAt: data.finishedAt,
      characterState: data.characterState,
    });
  }

  @SubscribeMessage('typing:finished')
  async handleTypingFinished(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
      include: { room: true },
    });
    if (!participant) return;
    const roomId = participant.roomId;
    this.server.to(`room:${roomId}`).emit('typing:player_finished', {
      userId,
      wpm: data.wpm,
      accuracy: data.accuracy,
      errors: data.errors,
      durationMs: data.durationMs,
    });
    // Optional: auto-end when all finished
  }

  @SubscribeMessage('chat:send')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { content: string },
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const participant = await this.prisma.roomParticipant.findFirst({
      where: { userId },
    });
    if (!participant) return;
    this.server.to(`room:${participant.roomId}`).emit('chat:message', {
      userId,
      username: user.username,
      content: data.content,
      type: 'user',
      createdAt: new Date().toISOString(),
    });
  }
}