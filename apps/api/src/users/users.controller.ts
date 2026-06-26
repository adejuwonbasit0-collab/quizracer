import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/index';

@ApiTags('users') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('me') getMe(@CurrentUser() u: any) { return this.users.getMe(u.id); }
  @Get('me/races') getMyRaces(@CurrentUser() u: any, @Query('limit') l = '10') { return this.users.getRecentRaces(u.id, +l); }
  @Patch('me') updateProfile(@CurrentUser() u: any, @Body() dto: any) { return this.users.updateProfile(u.id, dto); }
  @Get(':username/profile') getProfile(@Param('username') username: string) { return this.users.getProfile(username); }
  @Get(':username/races') getRaces(@Param('username') username: string, @Query('limit') l = '10') {
    return this.users.getProfile(username).then(p => this.users.getRecentRaces(p.id, +l));
  }
}


