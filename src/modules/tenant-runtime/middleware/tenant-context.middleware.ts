import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantRuntimeService } from '../tenant-runtime.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantRuntimeService: TenantRuntimeService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction) {
    await this.tenantRuntimeService.resolveRequestTenantContext(request);
    next();
  }
}
