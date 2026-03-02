export type CreatePendingPaymentInput = {
  bookingId: string;
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
