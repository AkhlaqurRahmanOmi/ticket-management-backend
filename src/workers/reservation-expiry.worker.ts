import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Cron } from '@nestjs/schedule';
import { BookingsService } from '@/modules/bookings/bookings.service';
import { REALTIME_PROVIDER } from '@/modules/domain-runtime/domain.tokens';
import type { DomainRealtimeProvider } from '@/modules/domain-runtime/realtime-provider.interface';

@Injectable()
export class ReservationExpiryWorker {
  private readonly logger = new Logger(ReservationExpiryWorker.name);
  private lastRunAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  // Runs every 15 seconds; keep batch bounded for predictable load.
  @Cron('*/15 * * * * *')
  async run(): Promise<void> {
    this.lastRunAt = new Date();
    try {
      const summary = await this.bookingsService.processExpiredHolds(100);
      const realtimeProvider = this.moduleRef.get<DomainRealtimeProvider>(
        REALTIME_PROVIDER,
        { strict: false },
      );

      for (const item of summary.results) {
        if (
          !realtimeProvider ||
          item.releasedInventoryRefIds.length === 0 ||
          !item.inventoryScopeId
        ) {
          continue;
        }
        await realtimeProvider.publishInventoryUpdates(item.inventoryScopeId, {
          type: 'reservation.expired',
          reservationId: item.reservationId,
          seatIds: item.releasedInventoryRefIds,
        });
      }

      if (summary.expired > 0) {
        this.logger.log(
          `Expired reservations processed=${summary.expired} scanned=${summary.scanned}`,
        );
      }

      this.lastSuccessAt = new Date();
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        'Reservation expiry worker cycle failed',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  getHealthStatus(): {
    lastRunAt: Date | null;
    lastSuccessAt: Date | null;
    lastError: string | null;
  } {
    return {
      lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
    };
  }
}
