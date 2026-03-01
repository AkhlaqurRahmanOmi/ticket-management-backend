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
import { EventsService } from '@/modules/events/events.service';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { RealtimeService } from '@/modules/realtime/realtime.service';
import { ReservationsModule } from '@/modules/reservations/reservations.module';
import { ReservationsService } from '@/modules/reservations/reservations.service';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { TicketsService } from '@/modules/tickets/tickets.service';

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
  imports: [EventsModule, ReservationsModule, TicketsModule, RealtimeModule],
  providers: [
    {
      provide: SEAT_SEARCH_PROVIDER,
      useFactory: (eventsService: EventsService) => ({
        getSeatMap: eventsService.getEventSeats.bind(eventsService),
        syncSeatInventory: eventsService.syncEventSeats.bind(eventsService),
      }),
      inject: [EventsService],
    },
    {
      provide: INVENTORY_PROVIDER,
      useFactory: (reservationsService: ReservationsService) => ({
        createHold: reservationsService.createReservation.bind(reservationsService),
        getHold: reservationsService.getReservation.bind(reservationsService),
        expireHolds: reservationsService.processExpiredReservations.bind(reservationsService),
      }),
      inject: [ReservationsService],
    },
    {
      provide: BOOKING_FINALIZER,
      useFactory: (ticketsService: TicketsService) => ({
        finalizePaymentSucceeded:
          ticketsService.finalizePaymentSucceeded.bind(ticketsService),
      }),
      inject: [TicketsService],
    },
    {
      provide: ISSUANCE_PROVIDER,
      useFactory: (ticketsService: TicketsService) => ({
        getIssuedTicket: ticketsService.getTicket.bind(ticketsService),
        getIssuedTicketsForUser: ticketsService.getMyTickets.bind(ticketsService),
      }),
      inject: [TicketsService],
    },
    {
      provide: REALTIME_PROVIDER,
      useFactory: (realtimeService: RealtimeService) => ({
        publishSeatUpdates:
          realtimeService.publishSeatUpdates.bind(realtimeService),
        streamSeatUpdates: realtimeService.streamEventSeats.bind(realtimeService),
      }),
      inject: [RealtimeService],
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
    SEAT_SEARCH_PROVIDER,
    INVENTORY_PROVIDER,
    BOOKING_FINALIZER,
    ISSUANCE_PROVIDER,
    REALTIME_PROVIDER,
    DOMAIN_TOPIC_REGISTRY,
  ],
})
export class EventsDomainModule {}
