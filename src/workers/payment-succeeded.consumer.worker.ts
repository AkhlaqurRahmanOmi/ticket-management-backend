import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KafkaJS } from '@confluentinc/kafka-javascript';
import { KafkaService } from '@/infra/kafka/kafka/kafka.service';
import {
  PaymentSucceededConsumer,
  PaymentSucceededEventEnvelope,
} from '@/modules/tickets/payment-succeeded.consumer';
import { buildLogContext } from '@/common/utils/log-context';
import { MetricsProvider } from '@/common/providers/metrics.provider';

@Injectable()
export class PaymentSucceededConsumerWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentSucceededConsumerWorker.name);
  private readonly maxProcessRetries = 3;
  private consumer: KafkaJS.Consumer | null = null;
  private consumerReady = false;
  private lastInitAt: Date | null = null;
  private lastInitError: string | null = null;
  private lastMessageAt: Date | null = null;

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly paymentSucceededConsumer: PaymentSucceededConsumer,
    private readonly metricsProvider: MetricsProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    this.lastInitAt = new Date();
    try {
      const consumer = await this.kafkaService.createConsumer(
        'tickets-payment-succeeded-v1',
      );
      if (!consumer) {
        this.consumerReady = false;
        this.lastInitError = 'Kafka consumer was not created.';
        return;
      }

      this.consumer = consumer;
      await consumer.subscribe({ topic: 'payment.succeeded' });
      await consumer.run({
        eachMessage: async (payload) => this.handleMessage(payload),
      });

      this.logger.log(
        'Kafka consumer subscribed to topic=payment.succeeded',
        buildLogContext({
          module: 'workers.paymentSucceededConsumer',
          action: 'consumer.subscribe',
          meta: { topic: 'payment.succeeded' },
        }),
      );
      this.consumerReady = true;
      this.lastInitError = null;
    } catch (error) {
      this.consumerReady = false;
      this.lastInitError =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to initialize payment.succeeded consumer worker ${JSON.stringify(
          buildLogContext({
            module: 'workers.paymentSucceededConsumer',
            action: 'consumer.init',
          }),
        )}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (this.consumer) {
        try {
          await this.consumer.disconnect();
        } catch (disconnectError) {
          this.logger.error(
            `Error disconnecting failed payment.succeeded consumer ${JSON.stringify(
              buildLogContext({
                module: 'workers.paymentSucceededConsumer',
                action: 'consumer.disconnect',
              }),
            )}`,
            disconnectError instanceof Error ? disconnectError.stack : undefined,
          );
        }
      }

      this.consumer = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.consumerReady = false;
    if (!this.consumer) return;
    try {
      await this.consumer.disconnect();
    } catch (error) {
      this.logger.error(
        `Error disconnecting payment.succeeded consumer ${JSON.stringify(
          buildLogContext({
            module: 'workers.paymentSucceededConsumer',
            action: 'consumer.disconnect',
          }),
        )}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async handleMessage(payload: KafkaJS.EachMessagePayload): Promise<void> {
    this.lastMessageAt = new Date();
    const startTime = Date.now();
    const raw = payload.message.value?.toString('utf8');
    if (!raw) {
      this.logger.warn(
        'Skipping payment.succeeded message with empty payload',
        buildLogContext({
          module: 'workers.paymentSucceededConsumer',
          action: 'message.receive',
          partition: payload.partition,
          offset: payload.message.offset,
        }),
      );
      this.metricsProvider.incrementCounter(
        'kafka_payment_succeeded_skipped_total',
        'Count of skipped payment.succeeded messages',
        1,
        { reason: 'empty_payload' },
      );
      return;
    }

    let parsed: PaymentSucceededEventEnvelope;
    try {
      parsed = JSON.parse(raw) as PaymentSucceededEventEnvelope;
    } catch {
      this.logger.warn(
        'Skipping payment.succeeded message with invalid JSON',
        buildLogContext({
          module: 'workers.paymentSucceededConsumer',
          action: 'message.parse',
          partition: payload.partition,
          offset: payload.message.offset,
        }),
      );
      this.metricsProvider.incrementCounter(
        'kafka_payment_succeeded_skipped_total',
        'Count of skipped payment.succeeded messages',
        1,
        { reason: 'invalid_json' },
      );
      return;
    }

    const headerCorrelationId = this.getCorrelationIdFromHeaders(payload);
    if (!parsed.correlationId && headerCorrelationId) {
      parsed.correlationId = headerCorrelationId;
    }

    const correlationId = parsed.correlationId ?? 'n/a';
    const paymentId =
      parsed.data && typeof parsed.data.paymentId === 'string'
        ? parsed.data.paymentId
        : 'n/a';

    const processResult = await this.processWithRetry(parsed);
    if (processResult.success) {
      this.logger.log(
        'Processed payment.succeeded',
        buildLogContext({
          module: 'workers.paymentSucceededConsumer',
          action: 'message.process',
          correlationId,
          paymentId,
          attempts: processResult.attempts,
          partition: payload.partition,
          offset: payload.message.offset,
        }),
      );
      this.metricsProvider.incrementCounter(
        'kafka_payment_succeeded_processed_total',
        'Count of successfully processed payment.succeeded messages',
      );
      this.metricsProvider.observeHistogram(
        'kafka_payment_succeeded_process_duration_seconds',
        'Duration of payment.succeeded message processing in seconds',
        (Date.now() - startTime) / 1000,
      );
      return;
    }

    this.logger.error(
      `Sending to DLQ after retries ${JSON.stringify(
        buildLogContext({
          module: 'workers.paymentSucceededConsumer',
          action: 'message.dlq',
          correlationId,
          paymentId,
          attempts: processResult.attempts,
          partition: payload.partition,
          offset: payload.message.offset,
        }),
      )}`,
      processResult.error instanceof Error
        ? processResult.error.stack
        : undefined,
    );
    this.metricsProvider.incrementCounter(
      'kafka_payment_succeeded_dlq_total',
      'Count of payment.succeeded messages routed to DLQ',
    );
    this.metricsProvider.observeHistogram(
      'kafka_payment_succeeded_process_duration_seconds',
      'Duration of payment.succeeded message processing in seconds',
      (Date.now() - startTime) / 1000,
    );

    try {
      await this.kafkaService.publish(
        'payment.succeeded.dlq',
        String(payload.message.key?.toString('utf8') ?? paymentId),
        {
          originalTopic: 'payment.succeeded',
          partition: payload.partition,
          offset: payload.message.offset,
          failedAt: new Date().toISOString(),
          attempts: processResult.attempts,
          errorMessage: processResult.error?.message ?? 'Unknown error',
          payload: parsed,
        },
        correlationId !== 'n/a'
          ? {
              'x-correlation-id': correlationId,
            }
          : undefined,
      );
    } catch (dlqError) {
      this.logger.error(
        `Failed to publish payment.succeeded DLQ event ${JSON.stringify(
          buildLogContext({
            module: 'workers.paymentSucceededConsumer',
            action: 'message.dlq.publish',
            correlationId,
            paymentId,
            partition: payload.partition,
            offset: payload.message.offset,
          }),
        )}`,
        dlqError instanceof Error ? dlqError.stack : undefined,
      );
    }
  }

  private async processWithRetry(message: PaymentSucceededEventEnvelope): Promise<{
    success: boolean;
    attempts: number;
    error?: Error;
  }> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxProcessRetries; attempt += 1) {
      try {
        await this.paymentSucceededConsumer.handle(message);
        return { success: true, attempts: attempt };
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          'Retrying payment.succeeded processing after failure',
          buildLogContext({
            module: 'workers.paymentSucceededConsumer',
            action: 'message.retry',
            correlationId: message.correlationId,
            paymentId:
              message.data && typeof message.data.paymentId === 'string'
                ? message.data.paymentId
                : undefined,
            attempts: attempt,
          }),
        );
        this.metricsProvider.incrementCounter(
          'kafka_payment_succeeded_retry_total',
          'Count of payment.succeeded retries',
        );
        if (attempt < this.maxProcessRetries) {
          await this.delay(100 * attempt);
        }
      }
    }

    return {
      success: false,
      attempts: this.maxProcessRetries,
      error: lastError,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getCorrelationIdFromHeaders(
    payload: KafkaJS.EachMessagePayload,
  ): string | undefined {
    const headers = payload.message.headers as
      | Record<string, unknown>
      | undefined;
    if (!headers) {
      return undefined;
    }

    const headerValue = headers['x-correlation-id'];
    if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
      return headerValue;
    }

    if (headerValue instanceof Uint8Array) {
      const decoded = Buffer.from(headerValue).toString('utf8').trim();
      return decoded.length > 0 ? decoded : undefined;
    }

    if (Array.isArray(headerValue) && headerValue.length > 0) {
      const first = headerValue[0];
      if (typeof first === 'string' && first.trim().length > 0) {
        return first;
      }

      if (first instanceof Uint8Array) {
        const decoded = Buffer.from(first).toString('utf8').trim();
        return decoded.length > 0 ? decoded : undefined;
      }
    }

    return undefined;
  }

  getHealthStatus(): {
    consumerReady: boolean;
    lastInitAt: Date | null;
    lastInitError: string | null;
    lastMessageAt: Date | null;
  } {
    return {
      consumerReady: this.consumerReady,
      lastInitAt: this.lastInitAt,
      lastInitError: this.lastInitError,
      lastMessageAt: this.lastMessageAt,
    };
  }
}
