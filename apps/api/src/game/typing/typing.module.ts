import { Module } from '@nestjs/common';
import { TypingService } from './typing.service';
import { TypingController } from './typing.controller';
@Module({ providers: [TypingService], controllers: [TypingController], exports: [TypingService] })
export class TypingModule {}
