import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { buildLogContext } from '@/common/utils/log-context';
import { BookingsService } from '@/modules/bookings/bookings.service';
import { RealtimeService } from '@/modules/realtime/realtime.service';
import { CreateEventReservationDto } from './dto/create-event-reservation.dto';
import { EventsRepository } from './events.repository';

@Injectable()
export class EventReservationsService {
  private readonly logger = new Logger(EventReservationsService.name);

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly eventsRepository: EventsRepository,
    private readonly realtimeService: RealtimeService,
    private readonly metricsProvider: MetricsProvider,
  ) {}

  async createReservation(
    userId: string,
    tenantOrgId: string,
    dto: CreateEventReservationDto,
    correlationId?: string,
  ) {
    const startTime = Date.now();

    try {
      const event = await this.eventsRepository.findEventTenantById(dto.eventId);
      if (!event) {
        throw new NotFoundException('Event not found.');
      }
      if (event.orgId !== tenantOrgId) {
        throw new ForbiddenException(
          'Event does not belong to the resolved tenant.',
        );
      }

      const result = await this.bookingsService.createSeatHold(
        userId,
        {
          eventId: dto.eventId,
          eventSeatId: dto.eventSeatId,
          idempotencyKey: dto.idempotencyKey,
        },
        correlationId ?? randomUUID(),
      );
      const reservation = result.hold;

      if (result.resolution === 'existing') {
        this.logger.log(
          'Returning existing reservation for idempotency key',
          buildLogContext({
            module: 'events',
            action: 'createReservation',
            userId,
            reservationId: reservation.id,
            eventId: reservation.eventId,
            meta: { idempotencyKey: dto.idempotencyKey },
          }),
        );
        this.metricsProvider.incrementCounter(
          'reservation_create_idempotent_total',
          'Count of reservation create requests that returned idempotent existing records',
        );
        return reservation;
      }

      if (result.resolution === 'recovered') {
        this.logger.warn(
          'Recovered reservation after concurrent create race',
          buildLogContext({
            module: 'events',
            action: 'createReservation',
            userId,
            reservationId: reservation.id,
            eventId: reservation.eventId,
            meta: { idempotencyKey: dto.idempotencyKey },
          }),
        );
        return reservation;
      }

      const seatIds = reservation.items
        .map((item) => item.eventSeatId)
        .filter((seatId): seatId is string => Boolean(seatId));

      if (seatIds.length > 0) {
        await this.realtimeService.publishSeatUpdates(reservation.eventId, {
          type: 'reservation.created',
          reservationId: reservation.id,
          seatIds,
        });
      }

      this.logger.log(
        'Reservation created',
        buildLogContext({
          module: 'events',
          action: 'createReservation',
          correlationId: result.correlationId,
          userId,
          reservationId: reservation.id,
          eventId: reservation.eventId,
          meta: { seatsCount: seatIds.length },
        }),
      );
      this.metricsProvider.incrementCounter(
        'reservation_create_success_total',
        'Count of successfully created reservations',
      );
      this.metricsProvider.observeHistogram(
        'reservation_create_duration_seconds',
        'Duration of reservation creation in seconds',
        (Date.now() - startTime) / 1000,
      );

      return reservation;
    } catch (error) {
      this.logger.error(
        `Reservation creation failed ${JSON.stringify(
          buildLogContext({
            module: 'events',
            action: 'createReservation',
            userId,
            eventId: dto.eventId,
            meta: { idempotencyKey: dto.idempotencyKey },
          }),
        )}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.metricsProvider.incrementCounter(
        'reservation_create_failure_total',
        'Count of failed reservation create requests',
      );
      this.metricsProvider.observeHistogram(
        'reservation_create_duration_seconds',
        'Duration of reservation creation in seconds',
        (Date.now() - startTime) / 1000,
      );
      throw error;
    }
  }

  async getReservation(reservationId: string) {
    const reservation = await this.bookingsService.getHoldOrThrow(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }

  async processExpiredReservations(batchSize = 100) {
    return this.bookingsService.processExpiredHolds(batchSize);
  }
}
