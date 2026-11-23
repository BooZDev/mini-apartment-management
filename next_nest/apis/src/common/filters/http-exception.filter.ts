import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';
import { mapPgError, pgErrorOf } from '../database/pg-error.util';
import { AppException, ErrorBody } from '../exceptions/app.exception';

const STATUS_CODES: Record<number, ErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
};

// Lỗi không lường trước: trả thông báo chung, chi tiết chỉ ghi log kèm requestId
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const error = this.toAppException(exception, req);
    if (res.headersSent) return;
    res.status(error.getStatus()).json({
      error: { ...(error.getResponse() as ErrorBody), requestId: req.requestId },
    });
  }

  private toAppException(exception: unknown, req: Request): AppException {
    if (exception instanceof AppException) return exception;
    if (exception instanceof ThrottlerException) return new AppException('TOO_MANY_REQUESTS');

    if (exception instanceof HttpException) {
      const code = STATUS_CODES[exception.getStatus()];
      return code ? new AppException(code) : this.internal(exception, req);
    }

    const mapped = mapPgError(exception);
    if (mapped) {
      if (mapped.code === 'VALIDATION_ERROR') {
        const pg = pgErrorOf(exception);
        this.logger.warn(`[${req.requestId}] ${req.method} ${req.path}: CSDL từ chối (${pg?.code} ${pg?.constraint ?? ''})`);
      }
      return mapped;
    }
    return this.internal(exception, req);
  }

  private internal(exception: unknown, req: Request) {
    this.logger.error(
      `[${req.requestId}] ${req.method} ${req.path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return new AppException('INTERNAL_ERROR');
  }
}
