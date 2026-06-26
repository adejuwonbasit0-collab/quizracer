import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly emitter: EventEmitter2,
  ) {}

  async register(dto: { email: string; username: string; displayName: string; password: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }] },
    });
    if (existing) {
      throw new ConflictException(existing.email === dto.email.toLowerCase() ? 'Email already in use' : 'Username already taken');
    }

    const passwordHash = await argon2.hash(dto.password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        username: dto.username.toLowerCase().trim(),
        displayName: dto.displayName.trim(),
        passwordHash,
        role: 'USER',
        coins: 100,
      },
    });

    await this.prisma.userStats.create({ data: { userId: user.id } });
    this.emitter.emit('user.registered', { userId: user.id });

    return this.issueTokenPair(user);
  }

  async login(dto: { identifier: string; password: string }) {
    const id = dto.identifier.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: id }, { username: id }] },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.isBanned) throw new UnauthorizedException(`Account suspended: ${user.banReason ?? 'Contact support'}`);

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), lastActiveAt: new Date() } });
    this.emitter.emit('user.loggedIn', { userId: user.id });

    return this.issueTokenPair(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get<string>('app.jwtRefreshSecret'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.isBanned) throw new UnauthorizedException('Invalid session');
      return this.issueTokenPair(user);
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  private issueTokenPair(user: any) {
    const payload = { sub: user.id, username: user.username, role: user.role };

    const accessToken = this.jwt.sign(payload, {
      expiresIn: this.config.get<string>('app.jwtAccessExpiresIn', '15m'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('app.jwtRefreshSecret'),
      expiresIn: this.config.get<string>('app.jwtRefreshExpiresIn', '30d'),
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken, expiresIn: 900 };
  }
}


