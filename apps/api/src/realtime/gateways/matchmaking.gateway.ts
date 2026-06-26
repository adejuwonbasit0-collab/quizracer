import { WebSocketGateway, SubscribeMessage, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({ namespace: 'matchmaking' })
@UseGuards(WsJwtGuard)
export class MatchmakingGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('matchmaking:queue')
  async handleQueue(client: Socket, payload: { mode: string; rated: boolean }) {
    const userId = client.data.userId;
    const username = client.data.username || 'user';
    return { queued: true, mode: payload.mode, rated: payload.rated };
  }

  @SubscribeMessage('matchmaking:cancel')
  async handleCancel(client: Socket) {
    return { cancelled: true };
  }
}


