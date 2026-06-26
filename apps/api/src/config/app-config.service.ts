import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  // ── App ──────────────────────────────────────────────────
  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get port(): number {
    return this.config.get<number>('PORT', 4000);
  }

  get frontendUrl(): string {
    return this.config.getOrThrow<string>('FRONTEND_URL');
  }

  get corsOrigins(): string[] {
    const extra = this.config.get<string>('CORS_ORIGINS', '');
    const origins = [this.frontendUrl];
    if (extra) origins.push(...extra.split(',').map((o) => o.trim()));
    return origins;
  }

  get swaggerEnabled(): boolean {
    return this.config.get<boolean>('SWAGGER_ENABLED', false);
  }

  get cookieSecret(): string {
    return this.config.getOrThrow<string>('COOKIE_SECRET');
  }

  // ── Database ─────────────────────────────────────────────
  get databaseUrl(): string {
    return this.config.getOrThrow<string>('DATABASE_URL');
  }

  // ── Redis ─────────────────────────────────────────────────
  get redisUrl(): string {
    return this.config.getOrThrow<string>('REDIS_URL');
  }

  // ── JWT ───────────────────────────────────────────────────
  get jwtAccessSecret(): string {
    return this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  get jwtRefreshSecret(): string {
    return this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
  }

  get jwtAccessExpiresIn(): string {
    return this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m');
  }

  get jwtRefreshExpiresIn(): string {
    return this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
  }

  // ── OAuth ─────────────────────────────────────────────────
  get googleClientId(): string {
    return this.config.get<string>('GOOGLE_CLIENT_ID', '');
  }

  get googleClientSecret(): string {
    return this.config.get<string>('GOOGLE_CLIENT_SECRET', '');
  }

  get googleCallbackUrl(): string {
    return this.config.get<string>('GOOGLE_CALLBACK_URL', '');
  }

  get googleEnabled(): boolean {
    return !!(this.googleClientId && this.googleClientSecret);
  }

  get discordClientId(): string {
    return this.config.get<string>('DISCORD_CLIENT_ID', '');
  }

  get discordClientSecret(): string {
    return this.config.get<string>('DISCORD_CLIENT_SECRET', '');
  }

  get discordCallbackUrl(): string {
    return this.config.get<string>('DISCORD_CALLBACK_URL', '');
  }

  get discordEnabled(): boolean {
    return !!(this.discordClientId && this.discordClientSecret);
  }

  // ── Email ─────────────────────────────────────────────────
  get smtpHost(): string {
    return this.config.get<string>('SMTP_HOST', '');
  }

  get smtpPort(): number {
    return this.config.get<number>('SMTP_PORT', 587);
  }

  get smtpSecure(): boolean {
    return this.config.get<boolean>('SMTP_SECURE', false);
  }

  get smtpUser(): string {
    return this.config.get<string>('SMTP_USER', '');
  }

  get smtpPass(): string {
    return this.config.get<string>('SMTP_PASS', '');
  }

  get emailFrom(): string {
    return this.config.get<string>('EMAIL_FROM', 'noreply@quizracer.io');
  }

  get emailFromName(): string {
    return this.config.get<string>('EMAIL_FROM_NAME', 'QuizRacer');
  }

  get emailEnabled(): boolean {
    return !!(this.smtpHost && this.smtpUser);
  }

  // ── Stripe ────────────────────────────────────────────────
  get stripeSecretKey(): string {
    return this.config.get<string>('STRIPE_SECRET_KEY', '');
  }

  get stripeWebhookSecret(): string {
    return this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
  }

  get stripeEnabled(): boolean {
    return !!this.stripeSecretKey;
  }

  // ── Paystack ──────────────────────────────────────────────
  get paystackSecretKey(): string {
    return this.config.get<string>('PAYSTACK_SECRET_KEY', '');
  }

  get paystackWebhookSecret(): string {
    return this.config.get<string>('PAYSTACK_WEBHOOK_SECRET', '');
  }

  get paystackEnabled(): boolean {
    return !!this.paystackSecretKey;
  }
}
