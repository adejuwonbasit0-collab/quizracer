import { Controller, Get, Patch, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/index';

@ApiTags('notifications') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('notifications')
export class NotificationsController {
  constructor(private readonly n: NotificationsService) {}
  @Get() getAll(@CurrentUser() u:any,@Query('page') p:string,@Query('limit') l:string,@Query('unread') ur:string) { return this.n.findForUser(u.id,+p||1,+l||20,ur==='true'); }
  @Get('unread-count') count(@CurrentUser() u:any) { return this.n.getUnreadCount(u.id); }
  @Patch(':id/read') @HttpCode(HttpStatus.OK) read(@CurrentUser() u:any,@Param('id') id:string) { return this.n.markRead(id,u.id); }
  @Patch('read-all') @HttpCode(HttpStatus.OK) readAll(@CurrentUser() u:any) { return this.n.markAllRead(u.id); }
}
