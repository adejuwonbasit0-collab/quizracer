import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  async listTournaments(opts: { status?: string; page?: number; limit?: number }) {
    const where: any = {};
    if (opts.status) where.status = opts.status;
    const skip = ((opts.page || 1) - 1) * (opts.limit || 10);
    const [items, total] = await Promise.all([
      this.prisma.tournament.findMany({ where, skip, take: opts.limit || 10, orderBy: { startsAt: 'asc' } }),
      this.prisma.tournament.count({ where })
    ]);
    return { items, total, page: opts.page || 1, limit: opts.limit || 10 };
  }

  async getTournament(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { entries: { include: { user: true } } }
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async createTournament(dto: any) {
    return this.prisma.tournament.create({ data: dto });
  }

  async registerPlayer(userId: string, tournamentId: string) {
    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } }
    });
    if (existing) throw new Error('Already registered');
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { rating: true } });
      return tx.tournamentEntry.create({
        data: { tournamentId, userId, seedRating: user?.rating || 1000 }
      });
    });
  }

  async withdrawPlayer(userId: string, tournamentId: string) {
    return this.prisma.tournamentEntry.delete({
      where: { tournamentId_userId: { tournamentId, userId } }
    });
  }

  async generateBracket(tournamentId: string) {
    // Placeholder – in real app you would generate matches
    return { message: 'Bracket generated', tournamentId };
  }
}


