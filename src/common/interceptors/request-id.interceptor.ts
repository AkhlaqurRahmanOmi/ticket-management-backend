import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';
import { HEADER_REQUEST_ID } from '../constants/headers';

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    const incomingRequestId = req.headers[HEADER_REQUEST_ID] as
      | string
      | undefined;
    const requestId =
      incomingRequestId && incomingRequestId.trim().length > 0
        ? incomingRequestId
        : randomUUID();

    req.requestId = requestId;
    res.setHeader(HEADER_REQUEST_ID, requestId);

    return next.handle();
  }
}
