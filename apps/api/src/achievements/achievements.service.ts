import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AchievementsService {
  private readonly logger=new Logger(AchievementsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async getUserAchievements(userId:string) {
    const [unlocked,all]=await Promise.all([
      this.prisma.userAchievement.findMany({ where:{userId}, include:{achievement:true}, orderBy:{unlockedAt:'desc'} }),
      this.prisma.achievement.findMany({ where:{isActive:true}, orderBy:[{category:'asc'},{rarity:'asc'}] }),
    ]);
    const unlockedIds=new Set(unlocked.map(u=>u.achievementId));
    return { unlocked:unlocked.map(u=>({...u.achievement,unlockedAt:u.unlockedAt})), locked:all.filter(a=>!unlockedIds.has(a.id)), total:all.length, unlockedCount:unlocked.length };
  }

  async checkAndUnlock(userId:string, ctx:{wpm?:number;accuracy?:number;isWin?:boolean;mode?:string;totalGames?:number;totalWins?:number;streak?:number;level?:number}): Promise<string[]> {
    const unlocked=await this.getUnlockedKeys(userId);
    const toUnlock:string[]=[];
    const {wpm=0,accuracy=0,isWin=false,mode,totalGames=0,totalWins=0,streak=0,level=1}=ctx;

    const check=(key:string,cond:boolean)=>{ if(cond&&!unlocked.has(key)) toUnlock.push(key); };
    check('first_race', totalGames>=1);
    check('games_10', totalGames>=10); check('games_50', totalGames>=50); check('games_100', totalGames>=100); check('games_500', totalGames>=500);
    if(isWin) { check('first_win',true); check('wins_10',totalWins>=10); check('wins_50',totalWins>=50); check('wins_100',totalWins>=100); }
    check('wpm_30',wpm>=30); check('wpm_60',wpm>=60); check('wpm_80',wpm>=80); check('wpm_100',wpm>=100);
    check('wpm_120',wpm>=120); check('wpm_140',wpm>=140); check('wpm_160',wpm>=160); check('wpm_200',wpm>=200);
    check('accuracy_90',accuracy>=90); check('accuracy_95',accuracy>=95); check('perfect_accuracy',accuracy>=100);
    check('streak_3',streak>=3); check('streak_7',streak>=7); check('streak_30',streak>=30);
    check('typing_first',mode==='TYPING_RACE'); check('quiz_first',mode==='QUIZ_BATTLE');
    check('level_10',level>=10); check('level_25',level>=25); check('level_50',level>=50);

    await Promise.all(toUnlock.map(k=>this.unlock(userId,k)));
    return toUnlock;
  }

  async unlock(userId:string, key:string): Promise<boolean> {
    const a=await this.prisma.achievement.findUnique({where:{key}});
    if(!a) return false;
    const existing=await this.prisma.userAchievement.findUnique({where:{userId_achievementId:{userId,achievementId:a.id}}});
    if(existing) return false;
    await this.prisma.userAchievement.create({data:{userId,achievementId:a.id}});
    if(a.xpReward>0||a.coinReward>0) await this.prisma.user.update({where:{id:userId},data:{xp:{increment:a.xpReward},coins:{increment:a.coinReward}}});
    this.logger.log(`Unlocked [${key}] for ${userId}`);
    return true;
  }

  private async getUnlockedKeys(userId:string): Promise<Set<string>> {
    const u=await this.prisma.userAchievement.findMany({where:{userId},include:{achievement:{select:{key:true}}}});
    return new Set(u.map(x=>x.achievement.key));
  }
}


