import { Module } from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import { AchievementsListener } from './achievements.listener';
@Module({ providers:[AchievementsService,AchievementsListener], controllers:[AchievementsController], exports:[AchievementsService] })
export class AchievementsModule {}


