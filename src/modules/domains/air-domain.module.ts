import {
  Injectable,
  Logger,
  MessageEvent,
  Module,
  NotImplementedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AirModule } from '@/modules/air/air.module';
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
    _userId: string,
    _dto: Record<string, unknown>,
    _correlationId?: string,
  ) {
    throw new NotImplementedException(
      'Air hold creation is not implemented yet.',
    );
  }

  getHold(_holdId: string) {
    throw new NotImplementedException(
      'Air hold retrieval is not implemented yet.',
    );
  }

  expireHolds(_batchSize = 100) {
    return {
      scanned: 0,
      expired: 0,
      results: [],
    };
  }
}

@Injectable()
export class AirIssuanceProvider {
  private readonly logger = new Logger(AirIssuanceProvider.name);

  async issueDocuments(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    this.logger.warn(
      `Air issuance requested before air domain implementation paymentId=${input.paymentId}`,
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
      reason: 'air_domain_not_implemented',
    };
  }

  getIssuedDocument(_documentId: string) {
    throw new NotImplementedException(
      'Air issued document lookup is not implemented yet.',
    );
  }

  getIssuedDocumentsForUser(_userId: string) {
    throw new NotImplementedException(
      'Air issued documents lookup is not implemented yet.',
    );
  }
}

@Injectable()
export class AirBookingFinalizerProvider implements BookingFinalizer {
  private readonly logger = new Logger(AirBookingFinalizerProvider.name);

  constructor(private readonly airIssuanceProvider: AirIssuanceProvider) {}

  async finalizePaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    const result = await this.airIssuanceProvider.issueDocuments(input);

    this.logger.warn(
      `air payment finalization is still a skeleton paymentId=${input.paymentId} processed=${result.processed} reason=${result.reason ?? 'n/a'}`,
    );

    return result;
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
  imports: [AirModule],
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
