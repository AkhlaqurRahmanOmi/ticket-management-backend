import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketsRepository } from './tickets.repository';

type FinalizePaymentSucceededInput = {
  paymentId: string;
  correlationId?: string;
  actor?: string;
};

@Injectable()
export class TicketsService {
  constructor(private readonly ticketsRepository: TicketsRepository) {}

  getTicket(ticketId: string) {
    return this.findTicketOrThrow(ticketId);
  }

  getMyTickets(userId: string) {
    return this.ticketsRepository.findTicketsByUserId(userId);
  }

  finalizePaymentSucceeded(input: FinalizePaymentSucceededInput) {
    return this.ticketsRepository.finalizeFromPaymentSucceeded(input);
  }

  private async findTicketOrThrow(ticketId: string) {
    const ticket = await this.ticketsRepository.findTicketById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    return ticket;
  }
}
