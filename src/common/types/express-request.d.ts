import type { AuthUser } from '@/common/auth/auth-user.type';
import type { TenantRequestContext } from '@/modules/tenant-runtime/types/tenant-context.types';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthUser;
    tenantContext?: TenantRequestContext;
  }
}

export {};
