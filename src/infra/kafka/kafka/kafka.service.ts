import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaJS } from '@confluentinc/kafka-javascript';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafkaClient: KafkaJS.Kafka | null;
  private readonly consumers: KafkaJS.Consumer[] = [];
  private readonly requiredTopics = [
    'reservation.created',
    'reservation.expired',
    'payment.succeeded',
    'payment.failed',
    'payment.succeeded.dlq',
  ];
  private producer: KafkaJS.Producer | null = null;
  private producerConnectPromise: Promise<KafkaJS.Producer | null> | null =
    null;
  private warnedMissingConfig = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.resolveBrokers();
    if (brokers.length === 0) {
      this.kafkaClient = null;
      return;
    }

    this.kafkaClient = new KafkaJS.Kafka({
      kafkaJS: {
        clientId: 'ticket-booking-backend',
        brokers,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.kafkaClient) {
      return;
    }

    await this.ensureRequiredTopics();
  }

  async createConsumer(groupId: string): Promise<KafkaJS.Consumer | null> {
    if (!this.kafkaClient) {
      if (!this.warnedMissingConfig) {
        this.logger.warn(
          'Kafka is not configured. Skipping consumer startup.',
        );
        this.warnedMissingConfig = true;
      }
      return null;
    }

    const consumer = this.kafkaClient.consumer({
      kafkaJS: {
        groupId,
        fromBeginning: false,
      },
    });

    try {
      await consumer.connect();
      this.consumers.push(consumer);
      return consumer;
    } catch (error) {
      this.logger.error(
        `Failed to connect Kafka consumer group=${groupId}`,
        error as Error,
      );
      return null;
    }
  }

  isConfigured(): boolean {
    return this.kafkaClient !== null;
  }

  async getHealthStatus(): Promise<{
    configured: boolean;
    producerConnected: boolean;
    consumers: number;
  }> {
    if (!this.kafkaClient) {
      return {
        configured: false,
        producerConnected: false,
        consumers: this.consumers.length,
      };
    }

    const producer = await this.getProducer();
    return {
      configured: true,
      producerConnected: producer !== null,
      consumers: this.consumers.length,
    };
  }

  async publish(
    topic: string,
    key: string,
    payload: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<void> {
    const producer = await this.getProducer();
    if (!producer) {
      throw new Error('Kafka producer is not configured.');
    }

    const correlationId =
      typeof payload.correlationId === 'string' && payload.correlationId.trim()
        ? payload.correlationId.trim()
        : undefined;
    const normalizedHeaders: Record<string, string> = {
      ...(headers ?? {}),
    };
    if (correlationId && !normalizedHeaders['x-correlation-id']) {
      normalizedHeaders['x-correlation-id'] = correlationId;
    }

    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
          headers:
            Object.keys(normalizedHeaders).length > 0
              ? normalizedHeaders
              : undefined,
        },
      ],
    });
  }

  async onModuleDestroy(): Promise<void> {
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
      } catch (error) {
        this.logger.error('Error while disconnecting Kafka consumer', error as Error);
      }
    }

    if (this.producer) {
      try {
        await this.producer.disconnect();
      } catch (error) {
        this.logger.error('Error while disconnecting Kafka producer', error as Error);
      }
    }
  }

  private async ensureRequiredTopics(): Promise<void> {
    const client = this.kafkaClient;
    if (!client) {
      return;
    }

    const admin = client.admin();
    try {
      await admin.connect();
      await admin.createTopics({
        topics: this.requiredTopics.map((topic) => ({
          topic,
          numPartitions: 1,
          replicationFactor: 1,
        })),
      });
      this.logger.log(
        `Kafka topics ensured: ${this.requiredTopics.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to ensure Kafka topics at startup',
        error as Error,
      );
    } finally {
      try {
        await admin.disconnect();
      } catch (disconnectError) {
        this.logger.warn(
          `Failed to disconnect Kafka admin client: ${
            (disconnectError as Error).message
          }`,
        );
      }
    }
  }

  private resolveBrokers(): string[] {
    const configured =
      this.configService.get<string>('kafka.brokers') ?? process.env.KAFKA_BROKERS;

    return configured
      ? configured
          .split(',')
          .map((broker) => broker.trim())
          .filter((broker) => broker.length > 0)
      : [];
  }

  private async getProducer(): Promise<KafkaJS.Producer | null> {
    const client = this.kafkaClient;
    if (!client) {
      return null;
    }

    if (this.producer) {
      return this.producer;
    }

    if (this.producerConnectPromise) {
      return this.producerConnectPromise;
    }

    this.producerConnectPromise = (async () => {
      const producer = client.producer();
      try {
        await producer.connect();
        this.producer = producer;
        return producer;
      } catch (error) {
        this.logger.error('Failed to connect Kafka producer', error as Error);
        return null;
      } finally {
        this.producerConnectPromise = null;
      }
    })();

    return this.producerConnectPromise;
  }
}
