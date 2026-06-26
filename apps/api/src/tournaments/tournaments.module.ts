import {
  Controller, Get, Post, Delete, Param,
  Query, Body, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Module } from '@nestjs/common';
import { TournamentsService, CreateTournamentDto } from './tournaments.service';
import { CurrentUser, AuthenticatedUser, Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '@quizracer/shared-types';

@ApiTags('Tournaments')
@ApiBearerAuth('access-token')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({ summary: 'List tournaments' })
  async list(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const data = await this.tournamentsService.listTournaments({ status, page: +page, limit: +limit });
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament details' })
  async getOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tournamentsService.getTournament(id);
    return { success: true, data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a tournament (admin)' })
  async create(@Body() dto: CreateTournamentDto) {
    const data = await this.tournamentsService.createTournament(dto);
    return { success: true, data };
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register for a tournament' })
  async register(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tournamentsService.registerPlayer(id, user.id);
  }

  @Delete(':id/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw from a tournament' })
  async withdraw(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tournamentsService.withdrawPlayer(id, user.id);
  }

  @Post(':id/bracket')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate tournament bracket (admin)' })
  async generateBracket(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.tournamentsService.generateBracket(id);
    return { success: true, data };
  }
}

@Module({
  controllers: [TournamentsController],
  providers: [TournamentsService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
