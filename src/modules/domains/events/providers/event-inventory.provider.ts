import { Injectable } from '@nestjs/common';
import { EventsService } from '@/modules/events/events.service';
import { GetEventSeatsQueryDto } from '@/modules/events/dto/get-event-seats.query.dto';
import { ReservationsService } from '@/modules/reservations/reservations.service';
import { CreateReservationDto } from '@/modules/reservations/dto/create-reservation.dto';

@Injectable()
export class EventInventoryProvider {
  constructor(
    private readonly eventsService: EventsService,
    private readonly reservationsService: ReservationsService,
  ) {}

  getSeatMap(eventId: string, query: GetEventSeatsQueryDto) {
    return this.eventsService.getEventSeats(eventId, query);
  }

  syncSeatInventory(actorUserId: string, eventId: string) {
    return this.eventsService.syncEventSeats(actorUserId, eventId);
  }

  createHold(
    userId: string,
    dto: CreateReservationDto,
    correlationId?: string,
  ) {
    return this.reservationsService.createReservation(
      userId,
      dto,
      correlationId,
    );
  }

  getHold(reservationId: string) {
    return this.reservationsService.getReservation(reservationId);
  }

  expireHolds(batchSize = 100) {
    return this.reservationsService.processExpiredReservations(batchSize);
  }
}
