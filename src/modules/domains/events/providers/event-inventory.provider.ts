import { Injectable } from '@nestjs/common';
import { EventsService } from '@/modules/events/events.service';
import { EventReservationsService } from '@/modules/events/event-reservations.service';
import { CreateEventReservationDto } from '@/modules/events/dto/create-event-reservation.dto';
import { GetEventSeatsQueryDto } from '@/modules/events/dto/get-event-seats.query.dto';

@Injectable()
export class EventInventoryProvider {
  constructor(
    private readonly eventsService: EventsService,
    private readonly eventReservationsService: EventReservationsService,
  ) {}

  getSeatMap(eventId: string, query: GetEventSeatsQueryDto) {
    return this.eventsService.getEventSeats(eventId, query);
  }

  syncSeatInventory(actorUserId: string, eventId: string) {
    return this.eventsService.syncEventSeats(actorUserId, eventId);
  }

  createHold(
    userId: string,
    dto: CreateEventReservationDto,
    correlationId?: string,
  ) {
    return this.eventReservationsService.createReservation(
      userId,
      dto,
      correlationId,
    );
  }

  getHold(reservationId: string) {
    return this.eventReservationsService.getReservation(reservationId);
  }

  expireHolds(batchSize = 100) {
    return this.eventReservationsService.processExpiredReservations(batchSize);
  }
}
