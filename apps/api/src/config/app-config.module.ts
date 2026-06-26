import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppConfigService } from './app-config.service';

const validationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  FRONTEND_URL: Joi.string().uri().required(),
  CORS_ORIGINS: Joi.string().optional(),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  COOKIE_SECRET: Joi.string().min(32).required(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),

  // OAuth - Google
  GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
  GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
  GOOGLE_CALLBACK_URL: Joi.string().optional().allow(''),

  // OAuth - Discord
  DISCORD_CLIENT_ID: Joi.string().optional().allow(''),
  DISCORD_CLIENT_SECRET: Joi.string().optional().allow(''),
  DISCORD_CALLBACK_URL: Joi.string().optional().allow(''),

  // Email
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string().default('noreply@quizracer.io'),
  EMAIL_FROM_NAME: Joi.string().default('QuizRacer'),

  // Stripe
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // Paystack
  PAYSTACK_SECRET_KEY: Joi.string().optional().allow(''),
  PAYSTACK_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
});

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
