import { Injectable } from '@nestjs/common';
import {
  type CreateSeatHoldInput,
  type ExpireBookingHoldResult,
} from '@/modules/bookings/types/booking-hold.types';
import { BookingsRepository } from '@/modules/bookings/bookings.repository';

@Injectable()
export class ReservationsRepository {
  constructor(private readonly bookingsRepository: BookingsRepository) {}

  findByUserAndIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.bookingsRepository.findHoldByUserAndIdempotencyKey(
      userId,
      idempotencyKey,
    );
  }

  findReservationById(reservationId: string) {
    return this.bookingsRepository.findHoldById(reservationId);
  }

  createSeatReservation(input: CreateSeatHoldInput) {
    return this.bookingsRepository.createSeatHold(input);
  }

  findExpiredActiveReservations(limit: number, now: Date) {
    return this.bookingsRepository.findExpiredActiveHolds(limit, now);
  }

  async expireReservationAndReleaseSeats(
    reservationId: string,
    correlationId: string,
  ): Promise<ExpireBookingHoldResult> {
    return this.bookingsRepository.expireHoldAndReleaseInventory(
      reservationId,
      correlationId,
    );
  }
}
