import type { BookingDomain } from '@/modules/domain-runtime/domain.types';

export type BookingPaymentItemRecord = {
  quantity: number;
  unitPriceCents: number;
  feesCents: number;
  inventoryType: string;
  inventoryRefId: string;
  seatLabel: string | null;
};

export type BookingPaymentTarget = {
  id: string;
  domainType: BookingDomain;
  userId: string;
  orgId: string | null;
  status: string;
  holdExpiresAt: Date | null;
  currency: string;
  inventoryScopeId: string | null;
  legacyReservationId: string | null;
  items: BookingPaymentItemRecord[];
};
