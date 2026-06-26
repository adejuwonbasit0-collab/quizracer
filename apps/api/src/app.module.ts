import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule }       from './prisma/prisma.module';
import { AuthModule }         from './auth/auth.module';
import { UsersModule }        from './users/users.module';
import { GameModule }         from './game/game.module';
import { RealtimeModule }     from './realtime/realtime.module';
import { LeaderboardModule }  from './leaderboard/leaderboard.module';
import { AchievementsModule } from './achievements/achievements.module';
import { ShopModule }         from './shop/shop.module';
import { NotificationsModule }from './notifications/notifications.module';
import { MatchmakingModule }  from './matchmaking/matchmaking.module';
import { AdminModule }        from './admin/admin.module';
import { AnalyticsModule }    from './analytics/analytics.module';
import { HealthModule }       from './health/health.module';
import { appConfig }          from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig], envFilePath: ['.env', '.env.local'] }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', maxListeners: 20 }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000,  limit: 30  },
      { name: 'medium',ttl: 10000, limit: 100 },
      { name: 'long',  ttl: 60000, limit: 300 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    GameModule,
    RealtimeModule,
    LeaderboardModule,
    AchievementsModule,
    ShopModule,
    NotificationsModule,
    MatchmakingModule,
    AdminModule,
    AnalyticsModule,
    HealthModule,
  ],
})
export class AppModule {}
