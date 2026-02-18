import { Injectable, Logger } from '@nestjs/common';
import { TicketsService } from './tickets.service';

type PaymentSucceededEventData = {
  paymentId: string;
  reservationId?: string;
  provider?: string;
  providerRef?: string;
  status?: string;
};

export type PaymentSucceededEventEnvelope = {
  eventId?: string;
  occurredAt?: string;
  version?: number;
  correlationId?: string;
  actor?: string;
  data?: PaymentSucceededEventData;
};

@Injectable()
export class PaymentSucceededConsumer {
  private readonly logger = new Logger(PaymentSucceededConsumer.name);

  constructor(private readonly ticketsService: TicketsService) {}

  async handle(message: PaymentSucceededEventEnvelope): Promise<void> {
    const data = message.data;
    if (!data?.paymentId) {
      this.logger.warn('Skipping payment.succeeded message without paymentId');
      return;
    }

    if (data.status && data.status !== 'SUCCEEDED') {
      this.logger.warn(
        `Skipping payment.succeeded message with invalid status=${data.status}`,
      );
      return;
    }

    const result = await this.ticketsService.finalizePaymentSucceeded({
      paymentId: data.paymentId,
      correlationId: message.correlationId,
      actor: message.actor,
    });

    this.logger.log(
      `payment.succeeded handled paymentId=${data.paymentId} processed=${result.processed} idempotent=${result.idempotent} orderId=${result.orderId ?? 'n/a'} tickets=${result.ticketIds.length}`,
    );
  }
}
