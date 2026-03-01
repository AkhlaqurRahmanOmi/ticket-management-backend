import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RealtimeService } from '@/modules/realtime/realtime.service';
import { ReservationsService } from '@/modules/reservations/reservations.service';

@Injectable()
export class ReservationExpiryWorker {
  private readonly logger = new Logger(ReservationExpiryWorker.name);
  private lastRunAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly realtimeService: RealtimeService,
  ) {}

  // Runs every 15 seconds; keep batch bounded for predictable load.
  @Cron('*/15 * * * * *')
  async run(): Promise<void> {
    this.lastRunAt = new Date();
    try {
      const summary = await this.reservationsService.processExpiredReservations(100);

      for (const item of summary.results) {
        if (item.releasedSeatIds.length === 0) continue;
        await this.realtimeService.publishSeatUpdates(item.eventId, {
          type: 'reservation.expired',
          reservationId: item.reservationId,
          seatIds: item.releasedSeatIds,
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
