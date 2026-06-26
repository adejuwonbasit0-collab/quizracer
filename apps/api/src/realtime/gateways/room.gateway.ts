import { WebSocketGateway, SubscribeMessage, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../../game/rooms/rooms.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({ namespace: 'room' })
@UseGuards(WsJwtGuard)
export class RoomGateway {
  @WebSocketServer() server: Server;

  constructor(private roomsService: RoomsService) {}

  @SubscribeMessage('room:create')
  async handleCreate(client: Socket, payload: any) {
    const userId = client.data.userId;
    const room = await this.roomsService.create(userId, payload);
    client.join(room.id);
    this.server.to(room.id).emit('room:update', room);
    return room;
  }

  @SubscribeMessage('room:join')
  async handleJoin(client: Socket, payload: { code: string }) {
    const userId = client.data.userId;
    const room = await this.roomsService.join(payload.code, userId);
    client.join(room.id);
    this.server.to(room.id).emit('room:update', room);
    return room;
  }

  @SubscribeMessage('room:leave')
  async handleLeave(client: Socket, payload: { roomId: string }) {
    const userId = client.data.userId;
    await this.roomsService.leave(payload.roomId, userId);
    client.leave(payload.roomId);
    const updated = await this.roomsService.findById(payload.roomId);
    this.server.to(payload.roomId).emit('room:update', updated);
    return updated;
  }

  @SubscribeMessage('room:ready')
  async handleReady(client: Socket, payload: { roomId: string }) {
    const userId = client.data.userId;
    const isReady = await this.roomsService.toggleReady(payload.roomId, userId);
    const canStart = await this.roomsService.canStart(payload.roomId);
    const updated = await this.roomsService.findById(payload.roomId);
    this.server.to(payload.roomId).emit('room:update', updated);
    if (canStart) {
      this.server.to(payload.roomId).emit('room:readyToStart', { canStart: true });
    }
    return { isReady, canStart };
  }

  @SubscribeMessage('room:start')
  async handleStart(client: Socket, payload: { roomId: string }) {
    const userId = client.data.userId;
    const canStart = await this.roomsService.canStart(payload.roomId);
    if (!canStart) throw new WsException('Cannot start');
    await this.roomsService.setStatus(payload.roomId, 'COUNTDOWN');
    const gameState = await this.roomsService.buildInitialGameState(payload.roomId);
    this.server.to(payload.roomId).emit('game:countdown', { countdown: 5 });
    setTimeout(async () => {
      await this.roomsService.setStatus(payload.roomId, 'ACTIVE');
      this.server.to(payload.roomId).emit('game:start', gameState);
    }, 5000);
    return { started: true };
  }

  @SubscribeMessage('room:kick')
  async handleKick(client: Socket, payload: { roomId: string; userId: string }) {
    const hostId = client.data.userId;
    await this.roomsService.kick(payload.roomId, hostId, payload.userId);
    const updated = await this.roomsService.findById(payload.roomId);
    this.server.to(payload.roomId).emit('room:update', updated);
    return updated;
  }

  @SubscribeMessage('room:spectate')
  async handleSpectate(client: Socket, payload: { code: string }) {
    const userId = client.data.userId;
    const room = await this.roomsService.spectate(payload.code, userId);
    client.join(room.id);
    this.server.to(room.id).emit('room:update', room);
    return room;
  }
}


