import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { TenantRequestContext } from '@/modules/tenant-runtime/types/tenant-context.types';

export const CurrentTenant = createParamDecorator(
  (property: keyof TenantRequestContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const tenantContext = request.tenantContext;
    if (!tenantContext) return undefined;

    return property ? tenantContext[property] : tenantContext;
  },
);
