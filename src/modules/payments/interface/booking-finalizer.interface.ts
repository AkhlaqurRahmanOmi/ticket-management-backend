export type PaymentSucceededEventData = {
  paymentId: string;
  bookingId?: string;
  reservationId?: string;
  provider?: string;
  providerRef?: string;
  status?: string;
};

export type PaymentSucceededEventEnvelope = {
  eventId?: string;
  occurredAt?: string;
  version?: number;
  correlationId?: string;
  actor?: string;
  data?: PaymentSucceededEventData;
};

export type FinalizePaymentSucceededInput = {
  paymentId: string;
  bookingId?: string;
  reservationId?: string;
  provider?: string;
  providerRef?: string;
  status?: string;
  correlationId?: string;
  actor?: string;
};

export type PaymentSucceededFinalizationResult = {
  processed: boolean;
  idempotent: boolean;
  paymentId: string;
  bookingId: string | null;
  orderId: string | null;
  reservationId: string | null;
  inventoryScopeId: string | null;
  issuedDocumentIds: string[];
  affectedInventoryRefIds: string[];
  reason?: string;
};

export interface BookingFinalizer {
  finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult>;
}
