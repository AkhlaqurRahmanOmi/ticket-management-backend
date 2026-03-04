import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { DomainRealtimeProvider } from '@/modules/domain-runtime/realtime-provider.interface';

@Injectable()
export class RailRealtimeProvider implements DomainRealtimeProvider {
  private readonly logger = new Logger(RailRealtimeProvider.name);

  async publishInventoryUpdates(
    inventoryScopeId: string,
    _payload: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug(
      `Skipping realtime publish for rail inventoryScopeId=${inventoryScopeId} because rail realtime is not implemented yet.`,
    );
  }

  streamInventoryUpdates(inventoryScopeId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({
        type: 'snapshot',
        data: {
          inventoryScopeId,
          items: [],
          notImplemented: true,
        },
      });
      subscriber.complete();
    });
  }
}
