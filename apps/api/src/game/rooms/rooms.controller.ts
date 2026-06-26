import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('rooms') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}
  @Get() getPublic(@Query('mode') mode:string) { return this.rooms.getPublicRooms(mode); }
  @Get(':code') getOne(@Param('code') code:string) { return this.rooms.findByCode(code); }
}
