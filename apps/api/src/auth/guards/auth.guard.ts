import {
  Injectable, ExecutionContext, UnauthorizedException, CanActivate
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '@quizracer/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ─────────────────────────────────────────────
// JWT access token guard (used globally via APP_GUARD)
// ─────────────────────────────────────────────
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Allow public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<T>(err: Error, user: T, _info: unknown): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }
    return user;
  }
}

// ─────────────────────────────────────────────
// Refresh token guard
// ─────────────────────────────────────────────
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

// ─────────────────────────────────────────────
// Role-based access guard
// ─────────────────────────────────────────────
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();
    if (!user) return false;

    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.USER]:       0,
      [UserRole.MODERATOR]:  1,
      [UserRole.ADMIN]:      2,
      [UserRole.SUPERADMIN]: 3,
    };

    const userLevel = roleHierarchy[user.role] ?? 0;
    return requiredRoles.some((r) => userLevel >= roleHierarchy[r]);
  }
}

// ─────────────────────────────────────────────
// Google / Discord OAuth guards
// ─────────────────────────────────────────────
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}

@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
