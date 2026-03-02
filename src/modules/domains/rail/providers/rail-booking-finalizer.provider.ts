import { Injectable, Logger } from '@nestjs/common';
import type {
  BookingFinalizer,
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';
import { RailIssuanceProvider } from './rail-issuance.provider';

@Injectable()
export class RailBookingFinalizerProvider implements BookingFinalizer {
  private readonly logger = new Logger(RailBookingFinalizerProvider.name);

  constructor(private readonly railIssuanceProvider: RailIssuanceProvider) {}

  async finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.railIssuanceProvider.issueDocuments(input);

    this.logger.warn(
      `rail payment finalization is still a skeleton paymentId=${input.paymentId} processed=${result.processed} reason=${result.reason ?? 'n/a'}`,
    );

    return result;
  }
}
