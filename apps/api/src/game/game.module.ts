import { Module } from '@nestjs/common';
import { RoomsModule }  from './rooms/rooms.module';
import { TypingModule } from './typing/typing.module';
import { QuizModule }   from './quiz/quiz.module';

@Module({ imports: [RoomsModule, TypingModule, QuizModule], exports: [RoomsModule, TypingModule, QuizModule] })
export class GameModule {}


