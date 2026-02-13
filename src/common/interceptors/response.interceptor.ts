import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Observable, map } from 'rxjs';
import {
  HEADER_ETAG,
  HEADER_IF_NONE_MATCH,
  HEADER_REQUEST_ID,
} from '../constants/headers';
import { createSuccessResponse } from '../utils/response.factory';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        const requestId =
          req.requestId ?? (res.getHeader(HEADER_REQUEST_ID) as string) ?? '';
        const path = req.originalUrl ?? req.url;

        const shouldSetEtag = req.method === 'GET' || req.method === 'HEAD';
        if (shouldSetEtag) {
          const etag = this.generateEtag(data);
          res.setHeader(HEADER_ETAG, etag);
          const ifNoneMatch = req.headers[HEADER_IF_NONE_MATCH] as
            | string
            | undefined;

          if (ifNoneMatch === etag) {
            res.status(304);
            return undefined;
          }
        }

        return createSuccessResponse(data, {
          path,
          correlationId: requestId,
        });
      }),
    );
  }

  private generateEtag(value: unknown): string {
    const serialized = JSON.stringify(value);
    const hash = createHash('sha1').update(serialized).digest('base64');
    return `W/"${hash}"`;
  }
}
