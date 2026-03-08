export const TENANT_CONTEXT_STATUSES = [
  'resolved',
  'unresolved',
  'conflict',
] as const;

export type TenantContextStatus = (typeof TENANT_CONTEXT_STATUSES)[number];

export const TENANT_CONTEXT_SOURCES = [
  'header',
  'route_param',
  'body',
  'none',
  'conflict',
] as const;

export type TenantContextSource = (typeof TENANT_CONTEXT_SOURCES)[number];

export type TenantIdentity = {
  orgId: string;
  slug: string;
  name: string;
};

export type TenantRequestContext = {
  status: TenantContextStatus;
  orgId: string | null;
  slug: string | null;
  name: string | null;
  source: TenantContextSource;
};

export type TenantCandidate = {
  source: Exclude<TenantContextSource, 'none' | 'conflict'>;
  value: string;
};
