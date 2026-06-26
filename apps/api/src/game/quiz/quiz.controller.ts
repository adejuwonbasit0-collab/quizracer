import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { Roles, CurrentUser, Public } from '../../auth/decorators/auth.decorators';

@ApiTags('quiz')
@ApiBearerAuth()
@Controller('quiz')
export class QuizController {
  constructor(private quiz: QuizService) {}

  @Get('questions')
  @Public()
  getAll(@Query('subject') s: string, @Query('difficulty') d: string, @Query('page') p: string, @Query('limit') l: string) {
    return this.quiz.getQuestions({ subject: s, difficulty: d, page: +p || 1, limit: +l || 20 });
  }

  @Post('questions')
  @UseGuards(JwtAuthGuard)
  // @Roles('ADMIN', 'SUPERADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.quiz.createQuestion(dto, user?.id);
  }

  @Patch('questions/:id')
  @UseGuards(JwtAuthGuard)
  // @Roles('ADMIN', 'SUPERADMIN')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.quiz.updateQuestion(id, dto);
  }
}
