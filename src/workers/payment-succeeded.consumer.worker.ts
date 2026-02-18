import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EachMessagePayload, Consumer } from 'kafkajs';
import { KafkaService } from '@/infra/kafka/kafka/kafka.service';
import {
  PaymentSucceededConsumer,
  PaymentSucceededEventEnvelope,
} from '@/modules/tickets/payment-succeeded.consumer';

@Injectable()
export class PaymentSucceededConsumerWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentSucceededConsumerWorker.name);
  private consumer: Consumer | null = null;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly paymentSucceededConsumer: PaymentSucceededConsumer,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const consumer = await this.kafkaService.createConsumer(
        'tickets-payment-succeeded-v1',
      );
      if (!consumer) return;

      this.consumer = consumer;
      await consumer.subscribe({
        topic: 'payment.succeeded',
        fromBeginning: false,
      });
      await consumer.run({
        eachMessage: async (payload) => this.handleMessage(payload),
      });

      this.logger.log('Kafka consumer subscribed to topic=payment.succeeded');
    } catch (error) {
      this.logger.error(
        'Failed to initialize payment.succeeded consumer worker',
        error as Error,
      );

      if (this.consumer) {
        try {
          await this.consumer.disconnect();
        } catch (disconnectError) {
          this.logger.error(
            'Error disconnecting failed payment.succeeded consumer',
            disconnectError as Error,
          );
        }
      }

      this.consumer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.consumer) return;
    try {
      await this.consumer.disconnect();
    } catch (error) {
      this.logger.error('Error disconnecting payment.succeeded consumer', error as Error);
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const raw = payload.message.value?.toString('utf8');
    if (!raw) {
      this.logger.warn(
        `Skipping payment.succeeded message with empty payload partition=${payload.partition} offset=${payload.message.offset}`,
      );
      return;
    }

    let parsed: PaymentSucceededEventEnvelope;
    try {
      parsed = JSON.parse(raw) as PaymentSucceededEventEnvelope;
    } catch {
      this.logger.warn(
        `Skipping payment.succeeded message with invalid JSON partition=${payload.partition} offset=${payload.message.offset}`,
      );
      return;
    }

    try {
      await this.paymentSucceededConsumer.handle(parsed);
    } catch (error) {
      this.logger.error(
        `Failed to process payment.succeeded partition=${payload.partition} offset=${payload.message.offset}`,
        error as Error,
      );
    }
  }
}
