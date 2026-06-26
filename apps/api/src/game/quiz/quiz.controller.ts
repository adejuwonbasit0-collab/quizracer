import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles, CurrentUser } from '../../auth/decorators/index';

@ApiTags('quiz') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}
  @Get('questions') getAll(@Query('subject') s:string,@Query('difficulty') d:string,@Query('page') p:string,@Query('limit') l:string) { return this.quiz.getQuestions({subject:s,difficulty:d,page:+p||1,limit:+l||20}); }
  @Post('questions') @UseGuards(RolesGuard) @Roles('ADMIN','SUPERADMIN') @HttpCode(HttpStatus.CREATED) create(@Body() dto:any,@CurrentUser() u:any) { return this.quiz.createQuestion(dto,u?.id); }
  @Patch('questions/:id') @UseGuards(RolesGuard) @Roles('ADMIN','SUPERADMIN') update(@Param('id') id:string,@Body() dto:any) { return this.quiz.updateQuestion(id,dto); }
}
