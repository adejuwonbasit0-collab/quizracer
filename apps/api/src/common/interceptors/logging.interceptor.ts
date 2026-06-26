import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = ctx.switchToHttp().getRequest<Request>();
    const res    = ctx.switchToHttp().getResponse<Response>();
    const start  = Date.now();
    const method = req.method;
    const url    = req.url;
    const userId = (req as any).user?.id;

    return next.handle().pipe(
      tap(() => {
        const ms     = Date.now() - start;
        const status = res.statusCode;
        this.logger.http(`${method} ${url} ${status} +${ms}ms`, { userId, ms, status });
      }),
      catchError((err) => {
        const ms = Date.now() - start;
        this.logger.http(`${method} ${url} ERR +${ms}ms`, { userId, ms, error: err.message });
        return throwError(() => err as Error);
      }),
    );
  }
}
