import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { buildLogContext } from '@/common/utils/log-context';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { RealtimeService } from '@/modules/realtime/realtime.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsRepository } from './reservations.repository';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);
  private readonly reservationTtlMinutes = 5;

  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly realtimeService: RealtimeService,
    private readonly metricsProvider: MetricsProvider,
  ) {}

  async createReservation(
    userId: string,
    dto: CreateReservationDto,
    correlationId?: string,
  ) {
    const startTime = Date.now();
    const existing = await this.reservationsRepository.findByUserAndIdempotencyKey(
      userId,
      dto.idempotencyKey,
    );

    if (existing) {
      this.logger.log(
        'Returning existing reservation for idempotency key',
        buildLogContext({
          module: 'reservations',
          action: 'create',
          userId,
          reservationId: existing.id,
          eventId: existing.eventId,
          meta: { idempotencyKey: dto.idempotencyKey },
        }),
      );
      this.metricsProvider.incrementCounter(
        'reservation_create_idempotent_total',
        'Count of reservation create requests that returned idempotent existing records',
      );
      return existing;
    }

    try {
      const effectiveCorrelationId = correlationId ?? randomUUID();
      const reservation = await this.reservationsRepository.createSeatReservation({
        userId,
        eventId: dto.eventId,
        eventSeatId: dto.eventSeatId,
        idempotencyKey: dto.idempotencyKey,
        ttlMinutes: this.reservationTtlMinutes,
        correlationId: effectiveCorrelationId,
      });
      if (!reservation) {
        throw new NotFoundException('Reservation could not be created.');
      }

      const seatIds = reservation?.items
        .map((item) => item.eventSeatId)
        .filter((seatId): seatId is string => Boolean(seatId));

      if (reservation && seatIds && seatIds.length > 0) {
        await this.realtimeService.publishSeatUpdates(reservation.eventId, {
          type: 'reservation.created',
          reservationId: reservation.id,
          seatIds,
        });
      }

      this.logger.log(
        'Reservation created',
        buildLogContext({
          module: 'reservations',
          action: 'create',
          correlationId: effectiveCorrelationId,
          userId,
          reservationId: reservation.id,
          eventId: reservation.eventId,
          meta: { seatsCount: seatIds?.length ?? 0 },
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
      // If a concurrent request with same idempotencyKey won the race,
      // return the canonical reservation instead of failing.
      const retried =
        await this.reservationsRepository.findByUserAndIdempotencyKey(
          userId,
          dto.idempotencyKey,
        );
      if (retried) {
        this.logger.warn(
          'Recovered reservation after concurrent create race',
          buildLogContext({
            module: 'reservations',
            action: 'create',
            userId,
            reservationId: retried.id,
            eventId: retried.eventId,
            meta: { idempotencyKey: dto.idempotencyKey },
          }),
        );
        return retried;
      }
      this.logger.error(
        `Reservation creation failed ${JSON.stringify(
          buildLogContext({
            module: 'reservations',
            action: 'create',
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
    const reservation =
      await this.reservationsRepository.findReservationById(reservationId);
    if (!reservation) {
      throw new NotFoundException('Reservation not found.');
    }

    return reservation;
  }

  async processExpiredReservations(batchSize = 100) {
    const startTime = Date.now();
    const now = new Date();
    const expired =
      await this.reservationsRepository.findExpiredActiveReservations(
        batchSize,
        now,
      );

    const results: Array<{
      reservationId: string;
      eventId: string;
      releasedSeatIds: string[];
    }> = [];

    for (const row of expired) {
      const processed = await this.reservationsRepository.expireReservationAndReleaseSeats(
        row.id,
        randomUUID(),
      );

      if (processed.updated) {
        results.push({
          reservationId: processed.reservationId,
          eventId: processed.eventId,
          releasedSeatIds: processed.releasedSeatIds,
        });
      }
    }

    this.logger.log(
      'Processed expired reservations batch',
      buildLogContext({
        module: 'reservations',
        action: 'expire.batch',
        meta: {
          batchSize,
          scanned: expired.length,
          expired: results.length,
        },
      }),
    );
    this.metricsProvider.incrementCounter(
      'reservation_expiry_scanned_total',
      'Total number of active reservations scanned by expiry worker',
      expired.length,
    );
    this.metricsProvider.incrementCounter(
      'reservation_expiry_expired_total',
      'Total number of reservations expired by expiry worker',
      results.length,
    );
    this.metricsProvider.observeHistogram(
      'reservation_expiry_batch_duration_seconds',
      'Duration of reservation expiry batch processing in seconds',
      (Date.now() - startTime) / 1000,
    );

    return {
      scanned: expired.length,
      expired: results.length,
      results,
    };
  }
}
