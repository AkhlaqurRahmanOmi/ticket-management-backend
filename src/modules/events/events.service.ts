import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  manageEvent(eventId: string) {
    return {
      eventId,
      message: 'Event manage authorization passed.',
    };
  }
}
