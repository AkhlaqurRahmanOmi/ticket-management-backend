import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { buildLogContext } from '@/common/utils/log-context';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { KafkaService } from '@/infra/kafka/kafka/kafka.service';
import { OutboxService } from '@/infra/outbox/outbox/outbox.service';

@Injectable()
export class OutboxPublisherWorker {
  private readonly logger = new Logger(OutboxPublisherWorker.name);
  private readonly batchSize: number;
  private readonly leaseSeconds: number;
  private readonly maxAttempts: number;
  private readonly maxLoops: number;
  private warnedKafkaUnavailable = false;
  private lastRunAt: Date | null = null;
  private lastSuccessAt: Date | null = null;
  private lastError: string | null = null;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly kafkaService: KafkaService,
    private readonly configService: ConfigService,
    private readonly metricsProvider: MetricsProvider,
  ) {
    this.batchSize = this.getPositiveNumber('outbox.publishBatchSize', 100);
    this.leaseSeconds = this.getPositiveNumber('outbox.publishLeaseSeconds', 30);
    this.maxAttempts = this.getPositiveNumber('outbox.publishMaxAttempts', 10);
    this.maxLoops = this.getPositiveNumber('outbox.publishMaxLoops', 5);
  }

  @Cron('*/5 * * * * *')
  async run(): Promise<void> {
    this.lastRunAt = new Date();
    try {
      await this.publishCycle();
      this.lastSuccessAt = new Date();
      this.lastError = null;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Outbox publisher cycle crashed unexpectedly ${JSON.stringify(
          buildLogContext({
            module: 'workers.outbox',
            action: 'publish.cycle',
          }),
        )}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  getHealthStatus(): {
    lastRunAt: Date | null;
    lastSuccessAt: Date | null;
    lastError: string | null;
  } {
    return {
      lastRunAt: this.lastRunAt,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
    };
  }

  private async publishCycle(): Promise<void> {
    const cycleStart = Date.now();
    if (!this.kafkaService.isConfigured()) {
      if (!this.warnedKafkaUnavailable) {
        this.logger.warn(
          'Kafka is not configured. Outbox publisher worker is paused.',
          buildLogContext({
            module: 'workers.outbox',
            action: 'publish.cycle',
          }),
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

    while (hasMore && loops < this.maxLoops) {
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

          try {
            await this.outboxService.markPublishFailure(
              event.id,
              event.attempts,
              this.maxAttempts,
              message,
              nextAvailableAt,
            );
          } catch (markError) {
            this.logger.error(
              `Failed to persist outbox failure state ${JSON.stringify(
                buildLogContext({
                  module: 'workers.outbox',
                  action: 'mark.failure',
                  correlationId: event.correlationId ?? undefined,
                  attempts: event.attempts,
                  meta: { outboxEventId: event.id },
                }),
              )}`,
              markError instanceof Error ? markError.stack : undefined,
            );
          }
        }
      }

      hasMore = batch.length === this.batchSize;
    }

    if (sent > 0 || failed > 0) {
      this.logger.log(
        'Outbox publish cycle completed',
        buildLogContext({
          module: 'workers.outbox',
          action: 'publish.cycle',
          meta: { scanned, sent, failed, loops },
        }),
      );
    }

    this.metricsProvider.incrementCounter(
      'outbox_publish_scanned_total',
      'Total outbox events scanned by publisher',
      scanned,
    );
    this.metricsProvider.incrementCounter(
      'outbox_publish_sent_total',
      'Total outbox events sent to Kafka',
      sent,
    );
    this.metricsProvider.incrementCounter(
      'outbox_publish_failed_total',
      'Total outbox publish failures',
      failed,
    );
    this.metricsProvider.observeHistogram(
      'outbox_publish_cycle_duration_seconds',
      'Duration of outbox publish cycles in seconds',
      (Date.now() - cycleStart) / 1000,
    );
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

  private getPositiveNumber(path: string, fallback: number): number {
    const value = this.configService.get<number>(path);
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }

    return Math.floor(value);
  }
}
