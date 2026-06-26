import { WebSocketGateway, SubscribeMessage, WebSocketServer, WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { QuizService } from '../../game/quiz/quiz.service';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({ namespace: 'quiz' })
@UseGuards(WsJwtGuard)
export class QuizGateway {
  @WebSocketServer() server: Server;

  constructor(private quizService: QuizService) {}

  @SubscribeMessage('quiz:answer')
  async handleAnswer(client: Socket, payload: { roomId: string; questionId: string; selectedIndex: number }) {
    const userId = client.data.userId;
    const result = await this.quizService.submitAnswer(payload.roomId, userId, payload);
    this.server.to(payload.roomId).emit('quiz:answerResult', { userId, ...result });
    return result;
  }

  @SubscribeMessage('quiz:reveal')
  async handleReveal(client: Socket, payload: { roomId: string; questionId: string }) {
    const data = await this.quizService.getRevealData(payload.questionId);
    this.server.to(payload.roomId).emit('quiz:reveal', data);
    return data;
  }

  @SubscribeMessage('quiz:next')
  async handleNext(client: Socket, payload: { roomId: string }) {
    const next = await this.quizService.advanceQuestion(payload.roomId);
    this.server.to(payload.roomId).emit('quiz:nextQuestion', next);
    return next;
  }

  @SubscribeMessage('quiz:state')
  async handleState(client: Socket, payload: { roomId: string }) {
    const state = await this.quizService.getQuizState(payload.roomId);
    return state;
  }

  @SubscribeMessage('quiz:end')
  async handleEnd(client: Socket, payload: { roomId: string }) {
    const results = await this.quizService.endQuiz(payload.roomId);
    this.server.to(payload.roomId).emit('quiz:end', results);
    return results;
  }
}


