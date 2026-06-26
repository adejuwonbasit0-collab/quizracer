import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

type WinstonLevel = 'error' | 'warn' | 'info' | 'http' | 'debug' | 'verbose';

const LEVEL_MAP: Record<string, WinstonLevel> = {
  error:   'error',
  warn:    'warn',
  log:     'info',
  debug:   'debug',
  verbose: 'verbose',
};

@Injectable()
export class AppLogger implements LoggerService {
  private readonly winston: winston.Logger;
  private context?: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';

    const formats: winston.Logform.Format[] = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
    ];

    const devFormat = winston.format.combine(
      ...formats,
      winston.format.colorize({ all: true }),
      winston.format.printf(({ level, message, timestamp, context, stack, ...meta }) => {
        const ctx   = context ? ` [${context}]` : '';
        const extra = Object.keys(meta).length ? `\n  ${JSON.stringify(meta)}` : '';
        const trace = stack ? `\n${stack}` : '';
        return `${timestamp} ${level}${ctx}: ${message}${extra}${trace}`;
      }),
    );

    const prodFormat = winston.format.combine(...formats, winston.format.json());

    const transports: winston.transport[] = [];

    if (!isTest) {
      transports.push(
        new winston.transports.Console({
          format: isProd ? prodFormat : devFormat,
          level: isProd ? 'info' : 'debug',
        }),
      );
    }

    if (isProd) {
      transports.push(
        new (winston.transports as any).DailyRotateFile({
          filename:    'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level:       'error',
          maxSize:     '20m',
          maxFiles:    '14d',
          format:      prodFormat,
        }),
        new (winston.transports as any).DailyRotateFile({
          filename:    'logs/app-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize:     '50m',
          maxFiles:    '7d',
          format:      prodFormat,
        }),
      );
    }

    this.winston = winston.createLogger({
      level:        isProd ? 'info' : 'debug',
      defaultMeta:  { service: 'quizracer-api' },
      transports,
      exitOnError:  false,
      silent:       isTest,
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  private write(winstonLevel: WinstonLevel, message: unknown, context?: string, meta?: Record<string, unknown>): void {
    this.winston.log({
      level:   winstonLevel,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: context ?? this.context,
      ...meta,
    });
  }

  log(message: unknown, context?: string):     void { this.write('info',    message, context); }
  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace ? { stack: trace } : undefined);
  }
  warn(message: unknown, context?: string):    void { this.write('warn',    message, context); }
  debug(message: unknown, context?: string):   void { this.write('debug',   message, context); }
  verbose(message: unknown, context?: string): void { this.write('verbose', message, context); }

  http(message: string, meta?: Record<string, unknown>): void {
    this.write('http', message, 'HTTP', meta);
  }

  /** Socket event logging */
  socket(event: string, userId: string, roomId?: string, meta?: Record<string, unknown>): void {
    this.write('debug', `socket:${event}`, 'Socket', {
      userId, roomId, ...meta,
    });
  }

  /** Multiplayer event logging */
  game(event: string, roomId: string, meta?: Record<string, unknown>): void {
    this.write('info', `game:${event}`, 'Game', { roomId, ...meta });
  }
}
