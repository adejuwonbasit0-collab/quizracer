import { WebSocketGateway, SubscribeMessage, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TypingService } from '../../game/typing/typing.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { RoomsService } from '../../game/rooms/rooms.service';

@WebSocketGateway({ namespace: 'typing' })
@UseGuards(WsJwtGuard)
export class TypingGateway {
  @WebSocketServer() server: Server;

  constructor(
    private typingService: TypingService,
    private roomsService: RoomsService
  ) {}

  @SubscribeMessage('typing:update')
  async handleTypingUpdate(client: Socket, payload: { roomId: string; progress: number }) {
    client.to(payload.roomId).emit('typing:progress', {
      userId: client.data.userId,
      progress: payload.progress
    });
  }

  @SubscribeMessage('typing:finish')
  async handleFinish(client: Socket, payload: { roomId: string; wpm: number; accuracy: number }) {
    const userId = client.data.userId;
    const room = await this.roomsService.findById(payload.roomId);
    const totalPlayers = room.participants.filter(p => !p.isSpectator).length;
    const finishedCount = await this.typingService.getFinishedCount(payload.roomId);
    const rank = finishedCount + 1;
    const result = await this.typingService.recordFinish(payload.roomId, userId, {
      wpm: payload.wpm,
      accuracy: payload.accuracy,
      rank
    });
    this.server.to(payload.roomId).emit('typing:result', result);
    const allDone = await this.typingService.checkAllFinished(payload.roomId);
    if (allDone) {
      const results = await this.typingService.endRace(payload.roomId);
      this.server.to(payload.roomId).emit('race:end', results);
    }
    return result;
  }
}


