import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { KafkaService } from '@/infra/kafka/kafka/kafka.service';
import { OutboxService } from '@/infra/outbox/outbox/outbox.service';

@Injectable()
export class OutboxPublisherWorker {
  private readonly logger = new Logger(OutboxPublisherWorker.name);
  private readonly batchSize = 100;
  private readonly leaseSeconds = 30;
  private readonly maxAttempts = 10;
  private warnedKafkaUnavailable = false;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly kafkaService: KafkaService,
  ) {}

  @Cron('*/5 * * * * *')
  async run(): Promise<void> {
    if (!this.kafkaService.isConfigured()) {
      if (!this.warnedKafkaUnavailable) {
        this.logger.warn(
          'Kafka is not configured. Outbox publisher worker is paused.',
        );
        this.warnedKafkaUnavailable = true;
      }
      return;
    }

    this.warnedKafkaUnavailable = false;

    let scanned = 0;
    let sent = 0;
    let failed = 0;
    let hasMore = true;
    let loops = 0;

    while (hasMore && loops < 5) {
      loops += 1;

      const batch = await this.outboxService.claimPendingBatch(
        this.batchSize,
        this.leaseSeconds,
      );
      if (batch.length === 0) {
        hasMore = false;
        continue;
      }

      scanned += batch.length;

      for (const event of batch) {
        try {
          const headers: Record<string, string> = {
            ...(event.headers ?? {}),
          };
          if (event.correlationId) {
            headers['x-correlation-id'] = event.correlationId;
          }

          await this.kafkaService.publish(
            event.topic,
            event.key,
            event.payload,
            Object.keys(headers).length > 0 ? headers : undefined,
          );
          await this.outboxService.markSent(event.id);
          sent += 1;
        } catch (error) {
          failed += 1;

          const message = this.extractErrorMessage(error);
          const nextAvailableAt = new Date(
            Date.now() + this.calculateBackoffMs(event.attempts),
          );

          await this.outboxService.markPublishFailure(
            event.id,
            event.attempts,
            this.maxAttempts,
            message,
            nextAvailableAt,
          );
        }
      }

      hasMore = batch.length === this.batchSize;
    }

    if (sent > 0 || failed > 0) {
      this.logger.log(
        `Outbox publish cycle scanned=${scanned} sent=${sent} failed=${failed}`,
      );
    }
  }

  private calculateBackoffMs(attempt: number): number {
    const cappedAttempt = Math.max(1, Math.min(10, attempt));
    const baseDelay = Math.min(120000, Math.pow(2, cappedAttempt - 1) * 1000);
    const jitter = Math.floor(Math.random() * 300);
    return baseDelay + jitter;
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
