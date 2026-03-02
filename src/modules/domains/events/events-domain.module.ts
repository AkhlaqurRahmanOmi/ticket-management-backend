import { Module } from '@nestjs/common';
import {
  BOOKING_FINALIZER,
  DOMAIN_TOPIC_REGISTRY,
  INVENTORY_PROVIDER,
  ISSUANCE_PROVIDER,
  REALTIME_PROVIDER,
  SEAT_SEARCH_PROVIDER,
} from '@/modules/domain-runtime/domain.tokens';
import type { DomainTopicRegistry } from '@/modules/domain-runtime/domain-topic-registry.interface';
import { EventsModule } from '@/modules/events/events.module';
import { IssuanceModule } from '@/modules/issuance/issuance.module';
import { IssuanceService } from '@/modules/issuance/issuance.service';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { ReservationsModule } from '@/modules/reservations/reservations.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { EventBookingFinalizerProvider } from './providers/event-booking-finalizer.provider';
import { EventInventoryProvider } from './providers/event-inventory.provider';
import { EventRealtimeProvider } from './providers/event-realtime.provider';

const EVENT_DOMAIN_TOPICS = [
  'reservation.created',
  'reservation.expired',
  'payment.succeeded',
  'payment.failed',
  'payment.succeeded.dlq',
  'event.created',
  'event.updated',
  'event.seats.synced',
  'ticket.issued',
  'seat.sold',
] as const;

const eventDomainTopicRegistry: DomainTopicRegistry = {
  getRequiredTopics: () => EVENT_DOMAIN_TOPICS,
};

@Module({
  imports: [
    EventsModule,
    ReservationsModule,
    TicketsModule,
    RealtimeModule,
    IssuanceModule,
  ],
  providers: [
    EventInventoryProvider,
    EventBookingFinalizerProvider,
    EventRealtimeProvider,
    {
      provide: SEAT_SEARCH_PROVIDER,
      useExisting: EventInventoryProvider,
    },
    {
      provide: INVENTORY_PROVIDER,
      useExisting: EventInventoryProvider,
    },
    {
      provide: BOOKING_FINALIZER,
      useExisting: EventBookingFinalizerProvider,
    },
    {
      provide: ISSUANCE_PROVIDER,
      useFactory: (issuanceService: IssuanceService) => ({
        issueDocuments: issuanceService.issueDocuments.bind(issuanceService),
        getIssuedDocument:
          issuanceService.getIssuedDocument.bind(issuanceService),
        getIssuedDocumentsForUser:
          issuanceService.getIssuedDocumentsForUser.bind(issuanceService),
      }),
      inject: [IssuanceService],
    },
    {
      provide: REALTIME_PROVIDER,
      useExisting: EventRealtimeProvider,
    },
    {
      provide: DOMAIN_TOPIC_REGISTRY,
      useValue: eventDomainTopicRegistry,
    },
  ],
  exports: [
    EventsModule,
    ReservationsModule,
    TicketsModule,
    RealtimeModule,
    EventInventoryProvider,
    SEAT_SEARCH_PROVIDER,
    INVENTORY_PROVIDER,
    EventBookingFinalizerProvider,
    BOOKING_FINALIZER,
    ISSUANCE_PROVIDER,
    EventRealtimeProvider,
    REALTIME_PROVIDER,
    DOMAIN_TOPIC_REGISTRY,
  ],
})
export class EventsDomainModule {}
