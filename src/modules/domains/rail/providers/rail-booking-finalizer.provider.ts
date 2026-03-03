import { Injectable, Logger } from '@nestjs/common';
import type {
  BookingFinalizer,
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';
import { RailIssuanceProvider } from './rail-issuance.provider';
import { RailRealtimeProvider } from './rail-realtime.provider';

@Injectable()
export class RailBookingFinalizerProvider implements BookingFinalizer {
  private readonly logger = new Logger(RailBookingFinalizerProvider.name);

  constructor(
    private readonly railIssuanceProvider: RailIssuanceProvider,
    private readonly railRealtimeProvider: RailRealtimeProvider,
  ) {}

  async finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.railIssuanceProvider.issueDocuments(input);

    if (
      result.processed &&
      result.inventoryScopeId &&
      result.affectedInventoryRefIds.length > 0
    ) {
      await this.railRealtimeProvider.publishInventoryUpdates(
        result.inventoryScopeId,
        {
          type: 'payment.succeeded',
          paymentId: input.paymentId,
          tripSeatIds: result.affectedInventoryRefIds,
        },
      );
    }

    this.logger.log(
      `rail payment finalization handled paymentId=${input.paymentId} processed=${result.processed} idempotent=${result.idempotent} documents=${result.issuedDocumentIds.length}`,
    );

    return result;
  }
}
