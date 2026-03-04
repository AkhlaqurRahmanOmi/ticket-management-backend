import type { BookingDomain } from '@/modules/domain-runtime/domain.types';

export type CreatePendingPaymentInput = {
  bookingId: string;
  domainType: BookingDomain;
  reservationId?: string | null;
  provider: string;
  providerRef: string;
  amountCents: number;
  currency: string;
};

export type ProcessWebhookInput = {
  provider: string;
  providerEventId: string;
  providerRef: string;
  status: 'SUCCEEDED' | 'FAILED';
  signatureValid: boolean;
  payload?: Record<string, unknown>;
  correlationId: string;
};
