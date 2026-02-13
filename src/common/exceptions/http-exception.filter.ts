import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HEADER_REQUEST_ID } from '../constants/headers';
import { createErrorResponse } from '../utils/response.factory';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId =
      req.requestId ?? (res.getHeader(HEADER_REQUEST_ID) as string) ?? '';
    res.setHeader(HEADER_REQUEST_ID, requestId);

    const path = req.originalUrl ?? req.url;
    const { message, details } = this.extractMessageAndDetails(exception);

    const body = createErrorResponse(
      { path, correlationId: requestId },
      {
        message,
        code: this.mapErrorCode(status),
        ...(details !== undefined ? { details } : {}),
      },
    );

    res.status(status).json(body);
  }

  private extractMessageAndDetails(exception: unknown): {
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { message: response };
      }

      if (response && typeof response === 'object') {
        const responseObj = response as Record<string, unknown>;
        const messageValue = responseObj.message;

        if (Array.isArray(messageValue)) {
          return {
            message: 'Validation failed',
            details: messageValue,
          };
        }

        if (typeof messageValue === 'string') {
          return {
            message: messageValue,
            details: responseObj.error,
          };
        }
      }

      return { message: exception.message };
    }

    if (exception instanceof Error) {
      return { message: exception.message };
    }

    return { message: 'Internal server error' };
  }

  private mapErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'INTERNAL_ERROR';
    }
  }
}
