import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import {
  PaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  WebhookVerificationInput,
} from '../interface/payment-provider.interface';

@Injectable()
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = 'manual';

  constructor(private readonly configService: ConfigService) {}

  async createPaymentIntent(
    input: PaymentIntentInput,
  ): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      providerRef: input.providerRef ?? randomUUID(),
    };
  }

  supportsSignatureVerification(): boolean {
    return this.getWebhookSecret().length > 0;
  }

  async verifyWebhookSignature(
    input: WebhookVerificationInput,
  ): Promise<boolean> {
    const secret = this.getWebhookSecret();
    if (!secret) return true;
    if (!input.signature) return false;

    const signedPayload = `${this.name}:${input.providerEventId}:${input.providerRef}:${input.status}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return expectedSignature === input.signature;
  }

  private getWebhookSecret(): string {
    return this.configService.get<string>('payments.webhookSecret') ?? '';
  }
}
