import { Injectable, Logger } from '@nestjs/common';
import type {
  BookingFinalizer,
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';
import { IssuanceService } from '@/modules/issuance/issuance.service';
import { EventRealtimeProvider } from './event-realtime.provider';

@Injectable()
export class EventBookingFinalizerProvider implements BookingFinalizer {
  private readonly logger = new Logger(EventBookingFinalizerProvider.name);

  constructor(
    private readonly issuanceService: IssuanceService,
    private readonly realtimeProvider: EventRealtimeProvider,
  ) {}

  async finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.issuanceService.issueDocuments(input);

    if (
      result.processed &&
      result.inventoryScopeId &&
      result.affectedInventoryRefIds.length > 0
    ) {
      await this.realtimeProvider.publishInventoryUpdates(
        result.inventoryScopeId,
        {
          type: 'payment.succeeded',
          paymentId: input.paymentId,
          reservationId: result.reservationId,
          seatIds: result.affectedInventoryRefIds,
        },
      );
    }

    this.logger.log(
      `payment.succeeded handled paymentId=${input.paymentId} processed=${result.processed} idempotent=${result.idempotent} orderId=${result.orderId ?? 'n/a'} documents=${result.issuedDocumentIds.length}`,
    );

    return result;
  }
}
