import type { TenantCustomerRecord } from './tenant-customer.types';
import type { TenantCustomerLinkingResult } from '../contracts/tenant-customer-linking.contract';

export const TENANT_CUSTOMER_ONBOARDING_SOURCES = [
  'reservation',
  'payment',
  'manual',
  'future_customer_auth',
] as const;

export type TenantCustomerOnboardingSource =
  (typeof TENANT_CUSTOMER_ONBOARDING_SOURCES)[number];

export type TenantCustomerOnboardingResolution =
  | 'created'
  | 'existing'
  | 'updated';

export type TenantCustomerOnboardingInput = {
  orgId: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  metadata?: unknown;
  source: TenantCustomerOnboardingSource;
};

export type TenantCustomerOnboardingResult = {
  resolution: TenantCustomerOnboardingResolution;
  tenantCustomer: TenantCustomerRecord;
  linking: TenantCustomerLinkingResult;
};
