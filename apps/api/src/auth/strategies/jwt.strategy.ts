import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('app.jwtAccessSecret'),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, username: true, displayName: true, email: true, avatar: true, role: true, level: true, xp: true, coins: true, gems: true, isPremium: true, isBanned: true, streak: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.isBanned) throw new UnauthorizedException('Account is banned');
    return user;
  }
}


