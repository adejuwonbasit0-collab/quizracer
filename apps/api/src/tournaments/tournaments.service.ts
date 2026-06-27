import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService, TTL } from '../redis/redis.service';
import { GameMode } from '@quizracer/shared-types';
type TournamentStatus = 'UPCOMING' | 'REGISTRATION' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
import {
  IsString, IsEnum, IsOptional, IsInt, Min, Max,
  IsDateString, IsNumber,
} from 'class-validator';

export class CreateTournamentDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsEnum(GameMode) mode!: GameMode;
  @IsInt() @Min(4) @Max(256) maxPlayers!: number;
  @IsOptional() @IsInt() @Min(0) entryFee?: number;
  @IsOptional() @IsInt() @Min(0) prizePool?: number;
  @IsDateString() startAt!: string;
  @IsOptional() @IsDateString() registrationDeadline?: string;
}

@Injectable()
export class TournamentsService {
  private readonly logger = new Logger(TournamentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listTournaments(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const where = { ...(status ? { status: status as TournamentStatus } : {}) };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      (this.prisma.tournament as any).findMany({
        where, skip, take: limit,
        orderBy: { startAt: 'asc' },
        include: { _count: { select: { entries: true } } },
      }),
      (this.prisma.tournament as any).count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTournament(id: string) {
    const tournament = await (this.prisma.tournament as any).findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true, username: true, displayName: true,
                avatar: true, rating: true, level: true,
              },
            },
          },
          orderBy: { seedRating: 'desc' },
        },
        matches: {
          orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
        },
        _count: { select: { entries: true } },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async createTournament(dto: CreateTournamentDto) {
    return (this.prisma.tournament as any).create({
      data: {
        name: dto.name,
        description: dto.description,
        mode: dto.mode,
        maxPlayers: dto.maxPlayers,
        entryFee: dto.entryFee ?? 0,
        prizePool: dto.prizePool ?? 0,
        startAt: new Date(dto.startAt),
        registrationDeadline: dto.registrationDeadline
          ? new Date(dto.registrationDeadline)
          : null,
        'status': 'UPCOMING',
      },
    });
  }

  async registerPlayer(tournamentId: string, userId: string) {
    const tournament = await (this.prisma.tournament as any).findUnique({
      where: { id: tournamentId },
      include: { _count: { select: { entries: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    if (tournament.status !== 'UPCOMING' && tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Tournament is not open for registration');
    }
    if (tournament.registrationDeadline && tournament.registrationDeadline < new Date()) {
      throw new BadRequestException('Registration deadline has passed');
    }
    if (tournament._count.entries >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new ConflictException('Already registered for this tournament');

    // Check entry fee
    if (tournament.entryFee > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { coins: true, rating: true },
      });
      if (!user || user.coins < tournament.entryFee) {
        throw new BadRequestException('Insufficient coins for entry fee');
      }

      await this.prisma.runTransaction(async (tx: any) => {
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: tournament.entryFee } },
        });
        await tx.transaction.create({
          data: {
            userId, type: 'PURCHASE',
            amount: -tournament.entryFee,
            currency: 'coins',
            description: `Tournament entry: ${tournament.name}`,
          },
        });
        await tx.tournamentEntry.create({
          data: { tournamentId, userId, seedRating: user.rating },
        });
      });
    } else {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }, select: { rating: true },
      });
      await this.prisma.tournamentEntry.create({
        data: { tournamentId, userId, seedRating: user?.rating ?? 1000 },
      });
    }

    await this.redis.del(`tournament:${tournamentId}`);
    return { success: true };
  }

  async withdrawPlayer(tournamentId: string, userId: string) {
    const tournament = await (this.prisma.tournament as any).findUnique({
      where: { id: tournamentId },
      select: { status: true, entryFee: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (tournament.status === 'ACTIVE') {
      throw new ForbiddenException('Cannot withdraw from an active tournament');
    }

    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry) throw new NotFoundException('Not registered for this tournament');

    await this.prisma.runTransaction(async (tx: any) => {
      await tx.tournamentEntry.delete({
        where: { tournamentId_userId: { tournamentId, userId } },
      });
      // Refund entry fee if not started
      if (tournament.entryFee > 0 && tournament.status !== 'ACTIVE') {
        await tx.user.update({
          where: { id: userId },
          data: { coins: { increment: tournament.entryFee } },
        });
        await tx.transaction.create({
          data: {
            userId, type: 'REFUND',
            amount: tournament.entryFee,
            currency: 'coins',
            description: `Tournament withdrawal refund: ${tournamentId}`,
          },
        });
      }
    });

    await this.redis.del(`tournament:${tournamentId}`);
    return { success: true };
  }

  async generateBracket(tournamentId: string) {
    const tournament = await this.getTournament(tournamentId);

    if (tournament.status !== 'REGISTRATION') {
      throw new BadRequestException('Tournament must be in REGISTRATION status to generate bracket');
    }

    const entries = [...(tournament as any).entries].sort((a, b) => b.seedRating - a.seedRating);
    if (entries.length < 2) throw new BadRequestException('Need at least 2 players');

    // Single elimination bracket
    const matches: Array<{
      tournamentId: string; round: number; matchNumber: number;
      player1Id: string | null; player2Id: string | null;
    }> = [];

    let round = 1;
    let players = entries.map((e) => e.userId);

    // Pad to power of 2
    const targetSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    while (players.length < targetSize) players.push('BYE');

    let matchNum = 1;
    while (players.length > 1) {
      const nextRound: string[] = [];
      for (let i = 0; i < players.length; i += 2) {
        const p1 = players[i] === 'BYE' ? null : players[i];
        const p2 = players[i + 1] === 'BYE' ? null : players[i + 1];
        matches.push({
          tournamentId, round, matchNumber: matchNum++,
          player1Id: p1, player2Id: p2,
        });
        // Advance BYE automatically
        if (!p2) nextRound.push(players[i]);
        else if (!p1) nextRound.push(players[i + 1]);
        else nextRound.push('TBD');
      }
      players = nextRound;
      round++;
    }

    await this.prisma.runTransaction(async (tx: any) => {
      await tx.tournamentMatch.deleteMany({ where: { tournamentId } });
      await tx.tournamentMatch.createMany({ data: matches });
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { 'status': 'ACTIVE' },
      });
    });

    await this.redis.del(`tournament:${tournamentId}`);
    return this.getTournament(tournamentId);
  }
}


