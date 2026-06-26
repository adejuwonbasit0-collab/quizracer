import { Controller, Get, Param, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { Public } from '../../auth/decorators/auth.decorators';

@Controller('rooms')
export class RoomsController {
  constructor(private rooms: RoomsService) {}

  @Get()
  @Public()
  getPublic(@Query('mode') mode: string) {
    return this.rooms.getPublicRooms(mode);
  }

  @Get(':code')
  @Public()
  getOne(@Param('code') code: string) {
    return this.rooms.findByCode(code);
  }
}