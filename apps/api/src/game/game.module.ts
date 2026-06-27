import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsModule } from './rooms/rooms.module';
import { TypingModule } from './typing/typing.module';
import { QuizModule } from './quiz/quiz.module';
import { GameGateway } from './game.gateway';

@Module({
  imports: [
    RoomsModule,
    TypingModule,
    QuizModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [GameGateway],
  exports: [RoomsModule, TypingModule, QuizModule],
})
export class GameModule {}