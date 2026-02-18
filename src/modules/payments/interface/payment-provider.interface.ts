export type PaymentIntentInput = {
  reservationId: string;
  amountCents: number;
  currency: string;
  providerRef?: string;
};

export type PaymentIntentResult = {
  provider: string;
  providerRef: string;
};

export type WebhookVerificationInput = {
  providerEventId: string;
  providerRef: string;
  status: 'SUCCEEDED' | 'FAILED';
  payload?: Record<string, unknown>;
  signature?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>;
  supportsSignatureVerification(): boolean;
  verifyWebhookSignature(input: WebhookVerificationInput): Promise<boolean>;
}

export type PaymentProviderRegistry = ReadonlyMap<string, PaymentProvider>;
