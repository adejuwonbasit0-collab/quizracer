import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port:               parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv:            process.env.NODE_ENV ?? 'development',
  frontendUrl:        process.env.FRONTEND_URL ?? 'http://localhost:3000',
  cookieSecret:       process.env.COOKIE_SECRET ?? 'cookie_secret_change_me',
  jwtAccessSecret:    process.env.JWT_ACCESS_SECRET ?? 'access_secret_change_me',
  jwtRefreshSecret:   process.env.JWT_REFRESH_SECRET ?? 'refresh_secret_change_me',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn:process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  isProd:             process.env.NODE_ENV === 'production',
}));
