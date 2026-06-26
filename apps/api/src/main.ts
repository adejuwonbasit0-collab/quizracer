import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const nodeEnv = config.get<string>('NODE_ENV', 'development');

  app.use(compression());
  app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
  app.use(cookieParser(config.get<string>('COOKIE_SECRET', 'cookie_secret')));

  app.enableCors({
    origin: (origin, cb) => {
      const allowed = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];
      if (!origin || allowed.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  if (nodeEnv !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('QuizRacer API')
      .setDescription('Multiplayer typing races & quiz battles')
      .setVersion('2.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));
  }

  await app.listen(port, '0.0.0.0');
  Logger.log(`ðŸš€ QuizRacer API â†’ http://localhost:${port}/api/v1`);
  Logger.log(`ðŸ“– Swagger docs  â†’ http://localhost:${port}/api/docs`);
}
bootstrap();


