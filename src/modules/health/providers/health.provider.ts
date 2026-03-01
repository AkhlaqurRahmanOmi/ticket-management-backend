import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { KafkaService } from '@/infra/kafka/kafka/kafka.service';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { RedisService } from '@/infra/redis/redis/redis.service';
import { OutboxPublisherWorker } from '@/workers/outbox-publisher.worker';
import { PaymentSucceededConsumerWorker } from '@/workers/payment-succeeded.consumer.worker';
import { ReservationExpiryWorker } from '@/workers/reservation-expiry.worker';

type HealthCheckItem = {
  name: string;
  ready: boolean;
  details?: Record<string, unknown>;
};

type AlertLevel = 'warning' | 'critical';

type AlertItem = {
  code: string;
  level: AlertLevel;
  message: string;
  value?: number;
  threshold?: number;
  details?: Record<string, unknown>;
};

@Injectable()
export class HealthProvider {
  async getLivenessReport(): Promise<{
    status: 'alive';
    timestamp: string;
    uptimeSeconds: number;
  }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly kafkaService: KafkaService,
    private readonly metricsProvider: MetricsProvider,
    private readonly reservationExpiryWorker: ReservationExpiryWorker,
    private readonly outboxPublisherWorker: OutboxPublisherWorker,
    private readonly paymentSucceededConsumerWorker: PaymentSucceededConsumerWorker,
  ) {}

  async getReadinessReport(): Promise<{
    status: 'ready' | 'not_ready';
    ready: boolean;
    timestamp: string;
    checks: HealthCheckItem[];
  }> {
    const checks: HealthCheckItem[] = [];

    checks.push(await this.checkPostgres());
    checks.push(await this.checkRedis());
    checks.push(await this.checkKafka());
    checks.push(this.checkReservationExpiryWorker());
    checks.push(this.checkOutboxPublisherWorker());
    checks.push(this.checkPaymentSucceededConsumerWorker());

    const ready = checks.every((check) => check.ready);
    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async getAlertsReport(): Promise<{
    status: 'ok' | 'alerting';
    critical: boolean;
    timestamp: string;
    alerts: AlertItem[];
  }> {
    const alerts: AlertItem[] = [];

    const readiness = await this.getReadinessReport();
    if (!readiness.ready) {
      alerts.push({
        code: 'READINESS_NOT_READY',
        level: 'critical',
        message: 'Readiness checks are failing.',
        details: {
          failedChecks: readiness.checks.filter((check) => !check.ready),
        },
      });
    }

    this.evaluateOutboxFailureRatio(alerts);
    this.evaluateWebhookFailureRatio(alerts);
    this.evaluateDlqGrowth(alerts);
    this.evaluateRetryGrowth(alerts);

    const critical = alerts.some((alert) => alert.level === 'critical');
    return {
      status: alerts.length > 0 ? 'alerting' : 'ok',
      critical,
      timestamp: new Date().toISOString(),
      alerts,
    };
  }

  private async checkPostgres(): Promise<HealthCheckItem> {
    const startedAt = Date.now();
    try {
      await this.prismaService.isHealthy();
      return {
        name: 'postgres',
        ready: true,
        details: { latencyMs: Date.now() - startedAt },
      };
    } catch (error) {
      return {
        name: 'postgres',
        ready: false,
        details: {
          latencyMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckItem> {
    const startedAt = Date.now();
    try {
      const healthy = await this.redisService.isHealthy();
      return {
        name: 'redis',
        ready: healthy,
        details: { latencyMs: Date.now() - startedAt },
      };
    } catch (error) {
      return {
        name: 'redis',
        ready: false,
        details: {
          latencyMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async checkKafka(): Promise<HealthCheckItem> {
    const startedAt = Date.now();
    try {
      const kafka = await this.kafkaService.getHealthStatus();
      return {
        name: 'kafka',
        ready: kafka.configured && kafka.producerConnected,
        details: {
          latencyMs: Date.now() - startedAt,
          configured: kafka.configured,
          producerConnected: kafka.producerConnected,
          consumers: kafka.consumers,
        },
      };
    } catch (error) {
      return {
        name: 'kafka',
        ready: false,
        details: {
          latencyMs: Date.now() - startedAt,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private checkReservationExpiryWorker(): HealthCheckItem {
    const status = this.reservationExpiryWorker.getHealthStatus();
    return this.evaluateCronWorker(
      'worker.reservation_expiry',
      status.lastSuccessAt,
      status.lastError,
      90_000,
    );
  }

  private checkOutboxPublisherWorker(): HealthCheckItem {
    const status = this.outboxPublisherWorker.getHealthStatus();
    return this.evaluateCronWorker(
      'worker.outbox_publisher',
      status.lastSuccessAt,
      status.lastError,
      30_000,
    );
  }

  private checkPaymentSucceededConsumerWorker(): HealthCheckItem {
    const status = this.paymentSucceededConsumerWorker.getHealthStatus();
    return {
      name: 'worker.payment_succeeded_consumer',
      ready: status.consumerReady,
      details: {
        consumerReady: status.consumerReady,
        lastInitAt: status.lastInitAt?.toISOString() ?? null,
        lastInitError: status.lastInitError,
        lastMessageAt: status.lastMessageAt?.toISOString() ?? null,
      },
    };
  }

  private evaluateCronWorker(
    name: string,
    lastSuccessAt: Date | null,
    lastError: string | null,
    staleAfterMs: number,
  ): HealthCheckItem {
    const now = Date.now();
    const startupGraceMs = 120_000;
    const uptimeMs = Math.floor(process.uptime() * 1000);

    if (!lastSuccessAt) {
      const withinStartupGrace = uptimeMs <= startupGraceMs;
      return {
        name,
        ready: withinStartupGrace && !lastError,
        details: {
          lastSuccessAt: null,
          lastError,
          uptimeMs,
          startupGraceMs,
          staleAfterMs,
        },
      };
    }

    const ageMs = now - lastSuccessAt.getTime();
    return {
      name,
      ready: ageMs <= staleAfterMs && !lastError,
      details: {
        lastSuccessAt: lastSuccessAt.toISOString(),
        ageMs,
        staleAfterMs,
        lastError,
      },
    };
  }

  private evaluateOutboxFailureRatio(alerts: AlertItem[]): void {
    const scanned = this.metricsProvider.getCounterTotal(
      'outbox_publish_scanned_total',
    );
    const failed = this.metricsProvider.getCounterTotal(
      'outbox_publish_failed_total',
    );
    const minSamples = this.getNumberThreshold('alerts.outboxMinSamples', 20);
    if (scanned < minSamples) {
      return;
    }

    const ratio = failed / Math.max(1, scanned);
    const threshold = this.getNumberThreshold(
      'alerts.outboxFailureRatioThreshold',
      0.1,
    );
    if (ratio >= threshold) {
      alerts.push({
        code: 'OUTBOX_FAILURE_RATIO_HIGH',
        level: 'critical',
        message: 'Outbox publish failure ratio is above threshold.',
        value: ratio,
        threshold,
        details: { scanned, failed },
      });
    }
  }

  private evaluateWebhookFailureRatio(alerts: AlertItem[]): void {
    const failed = this.metricsProvider.getCounterTotal(
      'payment_webhook_failed_total',
    );
    const processed = this.metricsProvider.getCounterTotal(
      'payment_webhook_processed_total',
    );
    const total = failed + processed;
    const minSamples = this.getNumberThreshold('alerts.webhookMinSamples', 20);
    if (total < minSamples) {
      return;
    }

    const ratio = failed / Math.max(1, total);
    const threshold = this.getNumberThreshold(
      'alerts.webhookFailureRatioThreshold',
      0.2,
    );
    if (ratio >= threshold) {
      alerts.push({
        code: 'PAYMENT_WEBHOOK_FAILURE_RATIO_HIGH',
        level: 'warning',
        message: 'Payment webhook failure ratio is above threshold.',
        value: ratio,
        threshold,
        details: { processed, failed, total },
      });
    }
  }

  private evaluateDlqGrowth(alerts: AlertItem[]): void {
    const dlq = this.metricsProvider.getCounterTotal(
      'kafka_payment_succeeded_dlq_total',
    );
    const threshold = this.getNumberThreshold(
      'alerts.paymentSucceededDlqThreshold',
      1,
    );
    if (dlq >= threshold) {
      alerts.push({
        code: 'PAYMENT_SUCCEEDED_DLQ_HIGH',
        level: 'critical',
        message: 'payment.succeeded DLQ count is above threshold.',
        value: dlq,
        threshold,
      });
    }
  }

  private evaluateRetryGrowth(alerts: AlertItem[]): void {
    const retries = this.metricsProvider.getCounterTotal(
      'kafka_payment_succeeded_retry_total',
    );
    const threshold = this.getNumberThreshold(
      'alerts.paymentSucceededRetryThreshold',
      20,
    );
    if (retries >= threshold) {
      alerts.push({
        code: 'PAYMENT_SUCCEEDED_RETRY_HIGH',
        level: 'warning',
        message: 'payment.succeeded retry count is above threshold.',
        value: retries,
        threshold,
      });
    }
  }

  private getNumberThreshold(path: string, fallback: number): number {
    const value = this.configService.get<number>(path);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return fallback;
    }

    return value;
  }
}
