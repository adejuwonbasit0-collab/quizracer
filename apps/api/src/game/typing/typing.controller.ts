import { Controller, Get, Query } from '@nestjs/common';
import { TypingService } from './typing.service';
import { Public } from '../../auth/decorators/auth.decorators';

@Controller('typing')
export class TypingController {
  constructor(private typing: TypingService) {}

  @Get('text')
  @Public()
  getText(@Query('difficulty') d: string, @Query('category') c: string) {
    return this.typing.getRandomText(d, c);
  }
}