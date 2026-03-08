import { Injectable, Logger } from '@nestjs/common';
import type {
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';
import { IssuanceService } from '@/modules/issuance/issuance.service';

@Injectable()
export class RailIssuanceProvider {
  private readonly logger = new Logger(RailIssuanceProvider.name);

  constructor(private readonly issuanceService: IssuanceService) {}

  async issueDocuments(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.issuanceService.issueRailDocuments(input);

    this.logger.log(
      `Rail issuance handled paymentId=${input.paymentId} processed=${result.processed} idempotent=${result.idempotent} documents=${result.issuedDocumentIds.length}`,
    );

    return result;
  }

  getIssuedDocument(documentId: string) {
    return this.issuanceService.getRailIssuedDocument(documentId);
  }

  getIssuedDocumentsForUser(userId: string) {
    return this.issuanceService.getRailIssuedDocumentsForUser(userId);
  }
}
