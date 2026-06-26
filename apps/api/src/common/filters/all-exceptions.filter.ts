import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly config: AppConfigService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx      = host.switchToHttp();
    const res      = ctx.getResponse<Response>();
    const req      = ctx.getRequest<Request>();
    const { status, message, errors } = this.classify(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} â†’ ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else if (this.config.isDevelopment) {
      this.logger.debug(`${req.method} ${req.url} â†’ ${status}: ${message}`);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      ...(errors ? { errors } : {}),
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }

  private classify(ex: unknown): { status: number; message: string; errors?: Record<string, string[]> } {
    if (ex instanceof HttpException) {
      const status = ex.getStatus();
      const body   = ex.getResponse();
      if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        if (Array.isArray(b['message'])) {
          return { status, message: 'Validation failed', errors: this.group(b['message'] as string[]) };
        }
        return { status, message: String(b['message'] ?? 'Request failed') };
      }
      return { status, message: String(body) };
    }

    // Prisma known errors (duck-typed to avoid namespace issues)
    if (this.isPrismaError(ex)) {
      return this.handlePrismaError(ex as Record<string, unknown>);
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'An unexpected error occurred' };
  }

  private isPrismaError(ex: unknown): boolean {
    return (
      typeof ex === 'object' &&
      ex !== null &&
      'code' in ex &&
      typeof (ex as Record<string, unknown>)['code'] === 'string' &&
      String((ex as Record<string, unknown>)['code']).startsWith('P')
    );
  }

  private handlePrismaError(err: Record<string, unknown>): { status: number; message: string } {
    switch (err['code']) {
      case 'P2002': {
        const fields = Array.isArray((err['meta'] as any)?.['target'])
          ? ((err['meta'] as any)['target'] as string[]).join(', ')
          : 'field';
        return { status: HttpStatus.CONFLICT, message: `A record with this ${fields} already exists` };
      }
      case 'P2025': return { status: HttpStatus.NOT_FOUND,    message: 'Record not found' };
      case 'P2003': return { status: HttpStatus.BAD_REQUEST,  message: 'Related record not found' };
      case 'P2034': return { status: HttpStatus.CONFLICT,     message: 'Transaction conflict, please retry' };
      default:
        this.logger.error(`Unhandled Prisma error ${err['code']}: ${err['message']}`);
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
    }
  }

  private group(messages: string[]): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const msg of messages) {
      const field = msg.split(' ')[0];
      out[field] = [...(out[field] ?? []), msg];
    }
    return out;
  }
}


