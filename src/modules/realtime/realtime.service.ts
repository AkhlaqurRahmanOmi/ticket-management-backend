import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RedisService } from '@/infra/redis/redis/redis.service';
import { RealtimeRepository } from './realtime.repository';

@Injectable()
export class RealtimeService {
  private readonly heartbeatMs = 25_000;

  constructor(
    private readonly redisService: RedisService,
    private readonly realtimeRepository: RealtimeRepository,
  ) {}

  async publishSeatUpdates(
    eventId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.redisService.publish(this.buildChannel(eventId), payload);
  }

  streamEventSeats(eventId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let unsubscribe: (() => Promise<void>) | null = null;
      const heartbeat = setInterval(() => {
        subscriber.next({
          type: 'heartbeat',
          data: {
            eventId,
            at: new Date().toISOString(),
          },
        });
      }, this.heartbeatMs);

      const bootstrap = async () => {
        const snapshot = await this.realtimeRepository.getEventSeatSnapshot(eventId);
        subscriber.next({
          type: 'snapshot',
          data: {
            eventId,
            seats: snapshot,
          },
        });

        unsubscribe = await this.redisService.subscribe(
          this.buildChannel(eventId),
          (payload) => {
            subscriber.next({
              type: 'seat.updated',
              data: {
                eventId,
                ...payload,
              },
            });
          },
        );
      };

      void bootstrap().catch((error) => subscriber.error(error));

      return () => {
        clearInterval(heartbeat);
        if (unsubscribe) {
          void unsubscribe();
        }
      };
    });
  }

  private buildChannel(eventId: string): string {
    return `realtime:event:${eventId}`;
  }
}
