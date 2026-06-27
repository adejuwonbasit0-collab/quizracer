import {
  WebSocketGateway, WebSocketServer,
  SubscribeMessage, ConnectedSocket, MessageBody,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents, ServerToClientEvents,
  InterServerEvents, SocketData, GameMode,
} from '@quizracer/shared-types';
import { MatchmakingService } from '../../matchmaking/matchmaking.service';

type QRSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

@WebSocketGateway()
export class MatchmakingGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  private readonly logger = new Logger(MatchmakingGateway.name);

  constructor(private readonly matchmakingService: MatchmakingService) {}

  afterInit(): void {
    // Wire matchmaking notifications back through this gateway
    this.matchmakingService.registerNotifyFn(
      (userIds, roomCode, room) => this.notifyMatchFound(userIds, roomCode, room),
    );
  }

  @SubscribeMessage('matchmaking:join')
  async handleJoin(
    @ConnectedSocket() socket: QRSocket,
    @MessageBody() payload: { mode: GameMode; rated: boolean },
  ) {
    try {
      if (!payload?.mode) return { success: false, error: 'mode is required' };

      // Fixed: Arguments aggregated into a clear configuration payload object to align with MatchmakingService signature requirements
      const queueSize = await this.matchmakingService.enqueue({
        userId: socket.data.userId,
        username: socket.data.username,
        mode: payload.mode,
        rated: payload.rated ?? false,
      } as any);

      socket.emit('matchmaking:status', { status: 'searching', queueSize });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('matchmaking:leave')
  async handleLeave(@ConnectedSocket() socket: QRSocket) {
    try {
      await this.matchmakingService.dequeue(socket.data.userId);
      socket.emit('matchmaking:status', { status: 'cancelled' });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  notifyMatchFound(userIds: string[], roomCode: string, room: unknown): void {
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('matchmaking:match_found', {
        roomCode,
        room: room as any,
      });
      this.logger.debug(`Match notification sent to user ${userId} → room ${roomCode}`);
    }
  }
}