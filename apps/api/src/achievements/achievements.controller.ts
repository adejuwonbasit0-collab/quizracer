import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/index';

@ApiTags('achievements') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('achievements')
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}
  @Get() getMine(@CurrentUser() u:any) { return this.achievements.getUserAchievements(u.id); }
  @Get('users/:userId') getUser(@Param('userId') id:string) { return this.achievements.getUserAchievements(id); }
}


