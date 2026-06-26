import { Controller, Get, Patch, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../auth/decorators/index';

@ApiTags('admin') @ApiBearerAuth() @UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN','SUPERADMIN','MODERATOR') @Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('analytics/overview') overview() { return this.admin.getOverview(); }
  @Get('analytics/detailed') analytics() { return this.admin.getAnalytics(); }
  @Get('users') users(@Query('search') s:string,@Query('filter') f:string,@Query('limit') l:string,@Query('offset') o:string) { return this.admin.getUsers({search:s,filter:f,limit:+l||50,offset:+o||0}); }
  @Patch('users/:id/ban') @Roles('ADMIN','SUPERADMIN') ban(@Param('id') id:string,@CurrentUser() actor:any,@Body() b:{reason?:string}) { return this.admin.banUser(id,actor.id,b.reason??'Admin action'); }
  @Patch('users/:id/unban') @Roles('ADMIN','SUPERADMIN') unban(@Param('id') id:string) { return this.admin.unbanUser(id); }
  @Patch('users/:id/role') @Roles('ADMIN','SUPERADMIN') role(@Param('id') id:string,@Body() b:{role:string}) { return this.admin.setRole(id,b.role); }
  @Get('anti-cheat/flags') flags(@Query('limit') l:string) { return this.admin.getFlags(+l||50); }
  @Delete('anti-cheat/flags/:id') @HttpCode(HttpStatus.OK) dismissFlag(@Param('id') id:string) { return this.admin.dismissFlag(id); }
  @Get('features') features() { return this.admin.getFeatures(); }
  @Patch('features/:key') @Roles('ADMIN','SUPERADMIN') setFeature(@Param('key') key:string,@Body() b:{enabled:boolean}) { return this.admin.setFeature(key,b.enabled); }
}


