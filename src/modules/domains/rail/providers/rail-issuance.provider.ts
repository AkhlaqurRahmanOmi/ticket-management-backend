import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import type {
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';

@Injectable()
export class RailIssuanceProvider {
  private readonly logger = new Logger(RailIssuanceProvider.name);

  async issueDocuments(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    this.logger.warn(
      `Rail issuance requested before rail domain implementation paymentId=${input.paymentId}`,
    );

    return {
      processed: false,
      idempotent: true,
      paymentId: input.paymentId,
      bookingId: input.bookingId ?? null,
      orderId: null,
      reservationId: input.reservationId ?? null,
      inventoryScopeId: null,
      issuedDocumentIds: [],
      affectedInventoryRefIds: [],
      reason: 'rail_domain_not_implemented',
    };
  }

  getIssuedDocument(_documentId: string) {
    throw new NotImplementedException(
      'Rail issued document lookup is not implemented yet.',
    );
  }

  getIssuedDocumentsForUser(_userId: string) {
    throw new NotImplementedException(
      'Rail issued documents lookup is not implemented yet.',
    );
  }
}
