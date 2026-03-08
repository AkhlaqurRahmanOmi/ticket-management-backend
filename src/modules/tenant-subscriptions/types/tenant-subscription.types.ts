import type { BookingDomain } from '@/modules/domain-runtime/domain.types';
import {
  BookingDomain as PrismaBookingDomain,
  TenantDomainSubscriptionStatus as PrismaTenantDomainSubscriptionStatus,
} from '@/generated/prisma/enums';

export const TENANT_SUBSCRIPTION_STATUSES = ['active', 'disabled'] as const;

export type TenantSubscriptionStatus =
  (typeof TENANT_SUBSCRIPTION_STATUSES)[number];

export type TenantSubscriptionRecord = {
  id: string;
  orgId: string;
  domain: BookingDomain;
  status: TenantSubscriptionStatus;
  createdAt: Date;
  updatedAt: Date;
  activatedAt: Date;
  disabledAt: Date | null;
};

export const isTenantSubscriptionStatus = (
  value: string | undefined,
): value is TenantSubscriptionStatus =>
  value !== undefined &&
  TENANT_SUBSCRIPTION_STATUSES.includes(value as TenantSubscriptionStatus);

export const toPrismaBookingDomain = (
  domain: BookingDomain,
): PrismaBookingDomain => {
  switch (domain) {
    case 'event':
      return PrismaBookingDomain.EVENT;
    case 'rail':
      return PrismaBookingDomain.RAIL;
    case 'air':
      return PrismaBookingDomain.AIR;
  }
};

export const fromPrismaBookingDomain = (
  domain: PrismaBookingDomain,
): BookingDomain => {
  switch (domain) {
    case PrismaBookingDomain.EVENT:
      return 'event';
    case PrismaBookingDomain.RAIL:
      return 'rail';
    case PrismaBookingDomain.AIR:
      return 'air';
  }
};

export const toPrismaTenantSubscriptionStatus = (
  status: TenantSubscriptionStatus,
): PrismaTenantDomainSubscriptionStatus => {
  switch (status) {
    case 'active':
      return PrismaTenantDomainSubscriptionStatus.ACTIVE;
    case 'disabled':
      return PrismaTenantDomainSubscriptionStatus.DISABLED;
  }
};

export const fromPrismaTenantSubscriptionStatus = (
  status: PrismaTenantDomainSubscriptionStatus,
): TenantSubscriptionStatus => {
  switch (status) {
    case PrismaTenantDomainSubscriptionStatus.ACTIVE:
      return 'active';
    case PrismaTenantDomainSubscriptionStatus.DISABLED:
      return 'disabled';
  }
};
