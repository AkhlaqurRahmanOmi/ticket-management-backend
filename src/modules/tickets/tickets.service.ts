import { Injectable } from '@nestjs/common';

@Injectable()
export class TicketsService {
  getTicket(ticketId: string) {
    return {
      ticketId,
      message: 'Ticket read authorization passed.',
    };
  }
}
