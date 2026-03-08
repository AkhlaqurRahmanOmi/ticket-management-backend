import { TenantCustomerStatus as PrismaTenantCustomerStatus } from '@/generated/prisma/enums';

export const TENANT_CUSTOMER_STATUSES = [
  'active',
  'inactive',
  'blocked',
] as const;

export type TenantCustomerStatus =
  (typeof TENANT_CUSTOMER_STATUSES)[number];

export type TenantCustomerRecord = {
  id: string;
  orgId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  status: TenantCustomerStatus;
  metadata: unknown;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTenantCustomerInput = {
  orgId: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  metadata?: unknown;
};

export const toPrismaTenantCustomerStatus = (
  status: TenantCustomerStatus,
): PrismaTenantCustomerStatus => {
  switch (status) {
    case 'active':
      return PrismaTenantCustomerStatus.ACTIVE;
    case 'inactive':
      return PrismaTenantCustomerStatus.INACTIVE;
    case 'blocked':
      return PrismaTenantCustomerStatus.BLOCKED;
  }
};

export const fromPrismaTenantCustomerStatus = (
  status: PrismaTenantCustomerStatus,
): TenantCustomerStatus => {
  switch (status) {
    case PrismaTenantCustomerStatus.ACTIVE:
      return 'active';
    case PrismaTenantCustomerStatus.INACTIVE:
      return 'inactive';
    case PrismaTenantCustomerStatus.BLOCKED:
      return 'blocked';
  }
};
