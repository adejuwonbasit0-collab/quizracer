import * as winston from 'winston';
import 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, context, ...meta }) => {
    const ctx = context ? ` [${context}]` : '';
    const extra = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${ts} ${level}${ctx}: ${message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export function createLogger(context?: string): winston.Logger {
  const isProd = process.env.NODE_ENV === 'production';

  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: isProd ? prodFormat : devFormat,
      silent: process.env.NODE_ENV === 'test',
    }),
  ];

  if (isProd) {
    transports.push(
      new (winston.transports as any).DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        format: prodFormat,
      }),
      new (winston.transports as any).DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '50m',
        maxFiles: '7d',
        format: prodFormat,
      }),
    );
  }

  return winston.createLogger({
    level: isProd ? 'info' : 'debug',
    defaultMeta: { service: 'quizracer-api', ...(context ? { context } : {}) },
    transports,
    exitOnError: false,
  });
}

export const appLogger = createLogger('App');


