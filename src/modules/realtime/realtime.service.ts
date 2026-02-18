import { Injectable } from '@nestjs/common';

@Injectable()
export class RealtimeService {
  // Placeholder for Redis pub/sub fanout in later phase.
  async publishSeatUpdates(
    _eventId: string,
    _payload: Record<string, unknown>,
  ): Promise<void> {}
}
