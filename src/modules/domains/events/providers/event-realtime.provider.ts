import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { DomainRealtimeProvider } from '@/modules/domain-runtime/realtime-provider.interface';
import { RealtimeService } from '@/modules/realtime/realtime.service';

@Injectable()
export class EventRealtimeProvider implements DomainRealtimeProvider {
  constructor(private readonly realtimeService: RealtimeService) {}

  publishInventoryUpdates(
    inventoryScopeId: string,
    payload: Record<string, unknown>,
  ) {
    return this.realtimeService.publishSeatUpdates(inventoryScopeId, payload);
  }

  streamInventoryUpdates(inventoryScopeId: string): Observable<MessageEvent> {
    return this.realtimeService.streamEventSeats(inventoryScopeId);
  }
}
