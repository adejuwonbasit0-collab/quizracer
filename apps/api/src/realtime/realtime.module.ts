import { Module } from '@nestjs/common';
import { GameGateway } from './gateways/game.gateway';
import { GameModule } from '../game/game.module';
import { MatchmakingModule } from '../matchmaking/matchmaking.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GameModule, MatchmakingModule, AchievementsModule, NotificationsModule, AuthModule],
  providers: [GameGateway],
})
export class RealtimeModule {}
