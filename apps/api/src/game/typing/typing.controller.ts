import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TypingService } from './typing.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('typing') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('typing')
export class TypingController {
  constructor(private readonly typing: TypingService) {}
  @Get('text') getText(@Query('difficulty') d:string, @Query('category') c:string) { return this.typing.getRandomText(d,c); }
}
