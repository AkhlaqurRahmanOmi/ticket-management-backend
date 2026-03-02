import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { BOOKING_RULES } from '@/modules/client-runtime/client.tokens';
import type { BookingRulesPolicy } from '@/modules/client-runtime/interfaces/client-policy.interface';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsRepository } from './bookings.repository';
import {
  type BookingHoldRecord,
  type CreateSeatHoldResult,
  type SeatHoldInput,
} from './types/booking-hold.types';
import { type BookingPaymentTarget } from './types/booking-payment.types';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly bookingsRepository: BookingsRepository,
    private readonly metricsProvider: MetricsProvider,
    @Inject(BOOKING_RULES)
    private readonly bookingRulesPolicy: BookingRulesPolicy,
  ) {}

  getKernelStatus() {
    return this.bookingsRepository.getKernelStatus();
  }

  prepareCreateBooking(dto: CreateBookingDto) {
    return {
      status: 'skeleton',
      domainType: dto.domainType,
      inventoryUnitIds: dto.inventoryUnitIds,
      idempotencyKey: dto.idempotencyKey,
      ...this.bookingsRepository.getKernelStatus(),
    };
  }

  async createSeatHold(
    userId: string,
    input: SeatHoldInput,
    correlationId?: string,
  ): Promise<CreateSeatHoldResult> {
    const existing = await this.bookingsRepository.findHoldByUserAndIdempotencyKey(
      userId,
      input.idempotencyKey,
    );

    if (existing) {
      return {
        hold: existing,
        correlationId: correlationId ?? randomUUID(),
        resolution: 'existing',
      };
    }

    const effectiveCorrelationId = correlationId ?? randomUUID();

    try {
      const hold = await this.bookingsRepository.createSeatHold({
        ...input,
        userId,
        ttlMinutes: this.resolveHoldTtlMinutes(),
        correlationId: effectiveCorrelationId,
      });

      if (!hold) {
        throw new NotFoundException('Booking hold could not be created.');
      }

      return {
        hold,
        correlationId: effectiveCorrelationId,
        resolution: 'created',
      };
    } catch (error) {
      const recovered = await this.bookingsRepository.findHoldByUserAndIdempotencyKey(
        userId,
        input.idempotencyKey,
      );

      if (recovered) {
        return {
          hold: recovered,
          correlationId: effectiveCorrelationId,
          resolution: 'recovered',
        };
      }

      throw error;
    }
  }

  async getHoldOrThrow(holdId: string): Promise<BookingHoldRecord> {
    const hold = await this.bookingsRepository.findHoldById(holdId);
    if (!hold) {
      throw new NotFoundException('Reservation not found.');
    }

    return hold;
  }

  getPaymentTarget(
    bookingId: string,
  ): Promise<BookingPaymentTarget | null> {
    return this.bookingsRepository.findPaymentTarget(bookingId);
  }

  async processExpiredHolds(batchSize = 100) {
    const startTime = Date.now();
    const now = new Date();
    const expired = await this.bookingsRepository.findExpiredActiveHolds(
      batchSize,
      now,
    );

    const results: Array<{
      reservationId: string;
      inventoryScopeId: string;
      releasedInventoryRefIds: string[];
    }> = [];

    for (const row of expired) {
      const processed =
        await this.bookingsRepository.expireHoldAndReleaseInventory(
          row.id,
          randomUUID(),
        );

      if (processed.updated) {
        results.push({
          reservationId: processed.reservationId,
          inventoryScopeId: processed.inventoryScopeId,
          releasedInventoryRefIds: processed.releasedInventoryRefIds,
        });
      }
    }

    this.logger.log(
      `Processed booking hold expiry batch scanned=${expired.length} expired=${results.length}`,
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

  private resolveHoldTtlMinutes(): number {
    const ttlSeconds = this.bookingRulesPolicy.getRules().seatHoldTtlSeconds;
    if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
      return 5;
    }

    return Math.max(1, Math.ceil(ttlSeconds / 60));
  }
}
