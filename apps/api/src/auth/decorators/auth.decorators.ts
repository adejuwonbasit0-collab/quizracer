import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { UserRole } from '@quizracer/shared-types';

// ── @Public() — marks route as no-auth required ──────────
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ── @Roles(...) — restricts route to specific roles ──────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// ── @CurrentUser() — injects authenticated user ──────────
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isBanned: boolean;
  isVerified: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// ── @SkipThrottle() — skip rate limiting on a route ──────
export const SKIP_THROTTLE_KEY = 'skipThrottle';
export const SkipThrottle = () => SetMetadata(SKIP_THROTTLE_KEY, true);
