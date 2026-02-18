import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsRepository } from './reservations.repository';

@Injectable()
export class ReservationsService {
  private readonly reservationTtlMinutes = 5;

  constructor(private readonly reservationsRepository: ReservationsRepository) {}

  async createReservation(userId: string, dto: CreateReservationDto) {
    const existing = await this.reservationsRepository.findByUserAndIdempotencyKey(
      userId,
      dto.idempotencyKey,
    );

    if (existing) {
      return existing;
    }

    try {
      return await this.reservationsRepository.createSeatReservation({
        userId,
        eventId: dto.eventId,
        eventSeatId: dto.eventSeatId,
        idempotencyKey: dto.idempotencyKey,
        ttlMinutes: this.reservationTtlMinutes,
        correlationId: randomUUID(),
      });
    } catch (error) {
      // If a concurrent request with same idempotencyKey won the race,
      // return the canonical reservation instead of failing.
      const retried =
        await this.reservationsRepository.findByUserAndIdempotencyKey(
          userId,
          dto.idempotencyKey,
        );
      if (retried) {
        return retried;
      }
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

    return {
      scanned: expired.length,
      expired: results.length,
      results,
    };
  }
}
