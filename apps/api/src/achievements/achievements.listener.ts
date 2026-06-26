import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AchievementsService } from './achievements.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsListener {
  constructor(private readonly achievements: AchievementsService, private readonly prisma: PrismaService) {}

  @OnEvent('race.finished')
  async onRaceFinished(payload: { userId:string; wpm:number; accuracy:number; isWin:boolean; mode:string }) {
    const stats=await this.prisma.userStats.findUnique({where:{userId:payload.userId}});
    const user=await this.prisma.user.findUnique({where:{id:payload.userId},select:{level:true,streak:true}});
    await this.achievements.checkAndUnlock(payload.userId, {
      wpm:payload.wpm, accuracy:payload.accuracy, isWin:payload.isWin, mode:payload.mode,
      totalGames:stats?.totalGames??0, totalWins:stats?.totalWins??0,
      streak:user?.streak??0, level:user?.level??1,
    });
  }
}


