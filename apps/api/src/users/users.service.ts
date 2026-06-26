import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id:true, username:true, displayName:true, avatar:true, bio:true,
        level:true, xp:true, xpToNextLevel:true, isPremium:true, streak:true, role:true,
        createdAt:true, stats:true, achievements: { include: { achievement: true }, orderBy: { unlockedAt: 'desc' } } },
    });
    if (!user) throw new NotFoundException('User not found');
    const sessions = await this.prisma.raceSession.findMany({ where: { userId: user.id } });
    const bestWpm = sessions.length ? Math.max(...sessions.map(s => s.wpm)) : 0;
    const avgWpm  = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.wpm,0)/sessions.length) : 0;
    const wins    = sessions.filter(s=>s.isWin).length;
    return { ...user, bestWpm, avgWpm, wins, totalRaces: sessions.length,
      xpRequired: user.xpToNextLevel, globalRank: await this.getGlobalRank(user.id) };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id:true, username:true, displayName:true, email:true, avatar:true, bio:true,
        role:true, level:true, xp:true, xpToNextLevel:true, coins:true, gems:true,
        isPremium:true, streak:true, rating:true, theme:true, soundEnabled:true, createdAt:true },
    });
    if (!user) throw new NotFoundException();
    const sessions = await this.prisma.raceSession.findMany({ where: { userId } });
    const bestWpm = sessions.length ? Math.max(...sessions.map(s => s.wpm)) : 0;
    const avgWpm  = sessions.length ? Math.round(sessions.reduce((a,s)=>a+s.wpm,0)/sessions.length) : 0;
    const wins    = sessions.filter(s=>s.isWin).length;
    return { ...user, bestWpm, avgWpm, wins, totalRaces: sessions.length,
      xpRequired: user.xpToNextLevel, globalRank: await this.getGlobalRank(userId) };
  }

  async getRecentRaces(userId: string, limit = 10) {
    const results = await this.prisma.raceSession.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: limit,
      include: { room: { select: { name:true, mode:true, _count: { select: { participants:true } } } } },
    });
    return results.map(r => ({
      id: r.id, roomName: r.room?.name ?? 'Race', mode: r.room?.mode ?? r.mode,
      position: r.rank, participantCount: r.room?._count?.participants ?? 1,
      wpm: r.wpm, accuracy: r.accuracy, durationMs: r.durationMs, isWin: r.isWin, createdAt: r.createdAt,
    }));
  }

  async updateProfile(userId: string, dto: { displayName?: string; bio?: string; theme?: string; soundEnabled?: boolean }) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  private async getGlobalRank(userId: string): Promise<number> {
    const count = await this.prisma.user.count({
      where: { rating: { gt: (await this.prisma.user.findUnique({ where: { id: userId }, select: { rating: true } }))?.rating ?? 0 } },
    });
    return count + 1;
  }
}
