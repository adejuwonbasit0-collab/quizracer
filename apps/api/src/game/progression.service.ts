import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressionService {
  constructor(private prisma: PrismaService) {}

  async addXp(userId: string, amount: number, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, xpToNextLevel: true } });
      if (!user) return;
      const newXp = user.xp + amount;
      let newLevel = user.level;
      let xpToNext = user.xpToNextLevel;
      while (newXp >= xpToNext) {
        newLevel++;
        xpToNext = Math.floor(xpToNext * 1.5);
      }
      await tx.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel, xpToNextLevel: xpToNext }
      });
      await tx.xpEvent.create({ data: { userId, amount, reason } });
    });
  }
}


