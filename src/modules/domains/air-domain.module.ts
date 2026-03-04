import {
  Injectable,
  Logger,
  MessageEvent,
  Module,
  NotImplementedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AirModule } from '@/modules/air/air.module';
import { CreateAirHoldDto } from '@/modules/air/dto/create-air-hold.dto';
import { AirService } from '@/modules/air/air.service';
import {
  BOOKING_FINALIZER,
  DOMAIN_TOPIC_REGISTRY,
  INVENTORY_PROVIDER,
  ISSUANCE_PROVIDER,
  REALTIME_PROVIDER,
  SEAT_SEARCH_PROVIDER,
} from '@/modules/domain-runtime/domain.tokens';
import type { DomainTopicRegistry } from '@/modules/domain-runtime/domain-topic-registry.interface';
import type { DomainRealtimeProvider } from '@/modules/domain-runtime/realtime-provider.interface';
import { IssuanceService } from '@/modules/issuance/issuance.service';
import { IssuanceModule } from '@/modules/issuance/issuance.module';
import type {
  BookingFinalizer,
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';

@Injectable()
export class AirInventoryProvider {
  constructor(private readonly airService: AirService) {}

  getSeatMap(
    inventoryScopeId: string,
    query?: Record<string, unknown>,
  ) {
    return this.airService.getFlightAvailability(
      inventoryScopeId,
      (query ?? {}) as never,
    );
  }

  syncSeatInventory(
    _actorUserId: string,
    _inventoryScopeId: string,
  ) {
    throw new NotImplementedException(
      'Air inventory sync is not implemented yet.',
    );
  }

  createHold(
    userId: string,
    dto: CreateAirHoldDto & { flightInstanceId: string },
    correlationId?: string,
  ) {
    return this.airService.createHold(
      userId,
      dto.flightInstanceId,
      dto,
      correlationId,
    );
  }

  getHold(holdId: string) {
    return this.airService.getHoldById(holdId);
  }

  expireHolds(batchSize = 100) {
    return this.airService.processExpiredHolds(batchSize);
  }
}

@Injectable()
export class AirIssuanceProvider {
  private readonly logger = new Logger(AirIssuanceProvider.name);

  constructor(private readonly issuanceService: IssuanceService) {}

  async issueDocuments(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.issuanceService.issueAirDocuments(input);

    this.logger.log(
      `Air issuance handled paymentId=${input.paymentId} processed=${result.processed} idempotent=${result.idempotent} documents=${result.issuedDocumentIds.length}`,
    );

    return result;
  }

  getIssuedDocument(documentId: string) {
    return this.issuanceService.getAirIssuedDocument(documentId);
  }

  getIssuedDocumentsForUser(userId: string) {
    return this.issuanceService.getAirIssuedDocumentsForUser(userId);
  }
}

@Injectable()
export class AirRealtimeProvider implements DomainRealtimeProvider {
  private readonly logger = new Logger(AirRealtimeProvider.name);

  async publishInventoryUpdates(
    inventoryScopeId: string,
    _payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(
      `Skipping realtime publish for air inventoryScopeId=${inventoryScopeId} because air realtime is not implemented yet.`,
    );
  }

  streamInventoryUpdates(inventoryScopeId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({
        type: 'snapshot',
        data: {
          inventoryScopeId,
          items: [],
          notImplemented: true,
        },
      });
      subscriber.complete();
    });
  }
}

@Injectable()
export class AirBookingFinalizerProvider implements BookingFinalizer {
  private readonly logger = new Logger(AirBookingFinalizerProvider.name);

  constructor(
    private readonly airIssuanceProvider: AirIssuanceProvider,
    private readonly airRealtimeProvider: AirRealtimeProvider,
  ) {}

  async finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.airIssuanceProvider.issueDocuments(input);

    if (
      result.processed &&
      result.inventoryScopeId &&
      result.affectedInventoryRefIds.length > 0
    ) {
      await this.airRealtimeProvider.publishInventoryUpdates(
        result.inventoryScopeId,
        {
          type: 'payment.succeeded',
          paymentId: input.paymentId,
          flightCabinInventoryIds: result.affectedInventoryRefIds,
        },
      );
    }

    this.logger.log(
      `air payment finalization handled paymentId=${input.paymentId} processed=${result.processed} idempotent=${result.idempotent} documents=${result.issuedDocumentIds.length}`,
    );

    return result;
  }
}

const AIR_DOMAIN_TOPICS = [
  'payment.succeeded',
  'payment.failed',
  'payment.succeeded.dlq',
  'ticket.issued',
] as const;

const airDomainTopicRegistry: DomainTopicRegistry = {
  getRequiredTopics: () => AIR_DOMAIN_TOPICS,
};

@Module({
  imports: [AirModule, IssuanceModule],
  providers: [
    AirInventoryProvider,
    AirIssuanceProvider,
    AirBookingFinalizerProvider,
    AirRealtimeProvider,
    {
      provide: SEAT_SEARCH_PROVIDER,
      useExisting: AirInventoryProvider,
    },
    {
      provide: INVENTORY_PROVIDER,
      useExisting: AirInventoryProvider,
    },
    {
      provide: BOOKING_FINALIZER,
      useExisting: AirBookingFinalizerProvider,
    },
    {
      provide: ISSUANCE_PROVIDER,
      useExisting: AirIssuanceProvider,
    },
    {
      provide: REALTIME_PROVIDER,
      useExisting: AirRealtimeProvider,
    },
    {
      provide: DOMAIN_TOPIC_REGISTRY,
      useValue: airDomainTopicRegistry,
    },
  ],
  exports: [
    AirInventoryProvider,
    AirIssuanceProvider,
    AirBookingFinalizerProvider,
    AirRealtimeProvider,
    SEAT_SEARCH_PROVIDER,
    INVENTORY_PROVIDER,
    BOOKING_FINALIZER,
    ISSUANCE_PROVIDER,
    REALTIME_PROVIDER,
    DOMAIN_TOPIC_REGISTRY,
  ],
})
export class AirDomainModule {}
