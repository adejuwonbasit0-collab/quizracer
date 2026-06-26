import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(opts: { sortBy?: string; search?: string; page?: number; limit?: number }) {
    const { sortBy = 'bestWpm', search = '', page = 1, limit = 20 } = opts;
    const skip = (page - 1) * limit;
    const where: any = { isBanned: false };
    if (search) where.OR = [
      { username: { contains: search.toLowerCase() } },
      { displayName: { contains: search } },
    ];
    const users = await this.prisma.user.findMany({
      where, skip, take: limit,
      select: { id:true, username:true, displayName:true, avatar:true, level:true, isPremium:true, rating:true,
        stats:true, raceSessions: { select: { wpm:true, accuracy:true, isWin:true } } },
    });
    const entries = users.map(u => {
      const s = u.raceSessions;
      const bestWpm   = s.length ? Math.max(...s.map(r=>r.wpm)) : 0;
      const avgWpm    = s.length ? Math.round(s.reduce((a,r)=>a+r.wpm,0)/s.length) : 0;
      const wins      = s.filter(r=>r.isWin).length;
      const totalRaces= s.length;
      return { userId:u.id, username:u.username, displayName:u.displayName, avatar:u.avatar,
        level:u.level, isPremium:u.isPremium, rating:u.rating, bestWpm, avgWpm, wins, totalRaces };
    });
    const sortFns: Record<string,(a:any,b:any)=>number> = {
      bestWpm:(a,b)=>b.bestWpm-a.bestWpm, avgWpm:(a,b)=>b.avgWpm-a.avgWpm,
      wins:(a,b)=>b.wins-a.wins, totalRaces:(a,b)=>b.totalRaces-a.totalRaces, rating:(a,b)=>b.rating-a.rating,
    };
    entries.sort(sortFns[sortBy] ?? sortFns.bestWpm);
    const total = await this.prisma.user.count({ where });
    return { entries, total, page, limit, totalPages: Math.ceil(total/limit) };
  }
}
