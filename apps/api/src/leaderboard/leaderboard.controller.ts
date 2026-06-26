import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('leaderboard') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly lb: LeaderboardService) {}
  @Get() get(@Query('sortBy') s:string,@Query('search') q:string,@Query('page') p:string,@Query('limit') l:string) {
    return this.lb.get({ sortBy:s, search:q, page:+p||1, limit:Math.min(+l||20,100) });
  }
}
