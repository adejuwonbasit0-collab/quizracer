import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('matchmaking') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('matchmaking')
export class MatchmakingController {
  constructor(private readonly mm: MatchmakingService) {}
  @Get('stats') getStats() { return this.mm.getStats(); }
}
