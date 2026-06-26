import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const req    = ctx.getRequest<Request>();
    const res    = ctx.getResponse<Response>();
    let status   = HttpStatus.INTERNAL_SERVER_ERROR;
    let message  = 'Internal server error';
    let errors: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') { message = body; }
      else if (typeof body === 'object' && body !== null) {
        message = (body as any).message ?? message;
        errors  = (body as any).errors;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled: ${exception.message}`, exception.stack);
    }

    if (status >= 500) this.logger.error(`[${req.method}] ${req.url} → ${status}: ${message}`);

    res.status(status).json({
      success: false, statusCode: status, message,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
