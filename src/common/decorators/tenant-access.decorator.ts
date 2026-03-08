import { SetMetadata } from '@nestjs/common';

export const TENANT_ACCESS_KEY = 'tenant_access';

export type TenantAccessOptions = {
  requireResolvedTenant?: boolean;
  requireActiveDomainSubscription?: boolean;
};

export const TenantAccess = (options: TenantAccessOptions = {}) =>
  SetMetadata(TENANT_ACCESS_KEY, {
    requireResolvedTenant: options.requireResolvedTenant ?? true,
    requireActiveDomainSubscription:
      options.requireActiveDomainSubscription ?? false,
  } satisfies Required<TenantAccessOptions>);
