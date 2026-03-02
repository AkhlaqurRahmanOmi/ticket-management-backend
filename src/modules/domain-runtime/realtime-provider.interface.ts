import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

export interface DomainRealtimeProvider {
  publishInventoryUpdates(
    inventoryScopeId: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
  streamInventoryUpdates(
    inventoryScopeId: string,
  ): Observable<MessageEvent>;
}
