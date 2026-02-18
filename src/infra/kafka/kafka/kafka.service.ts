import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private readonly kafkaClient: Kafka | null;
  private readonly consumers: Consumer[] = [];
  private producer: Producer | null = null;
  private producerConnectPromise: Promise<Producer | null> | null = null;
  private warnedMissingConfig = false;

  constructor(private readonly configService: ConfigService) {
    const brokers = this.resolveBrokers();
    if (brokers.length === 0) {
      this.kafkaClient = null;
      return;
    }

    this.kafkaClient = new Kafka({
      clientId: 'ticket-booking-backend',
      brokers,
    });
  }

  async createConsumer(groupId: string): Promise<Consumer | null> {
    if (!this.kafkaClient) {
      if (!this.warnedMissingConfig) {
        this.logger.warn(
          'Kafka is not configured. Skipping consumer startup.',
        );
        this.warnedMissingConfig = true;
      }
      return null;
    }

    const consumer = this.kafkaClient.consumer({ groupId });

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

    await producer.send({
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(payload),
          headers,
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

  private async getProducer(): Promise<Producer | null> {
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
