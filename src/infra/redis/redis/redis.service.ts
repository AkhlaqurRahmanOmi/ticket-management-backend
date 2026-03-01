import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl =
      this.configService.get<string>('redis.url') ?? process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL is required for RedisService.');
    }

    this.publisher = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
  }

  async onModuleInit(): Promise<void> {
    await Promise.all([this.publisher.ping(), this.subscriber.ping()]);
    this.logger.log('Connected to Redis (publisher/subscriber).');
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
    this.logger.log('Disconnected from Redis.');
  }

  async isHealthy(): Promise<boolean> {
    const [publisherPing, subscriberPing] = await Promise.all([
      this.publisher.ping(),
      this.subscriber.ping(),
    ]);

    return publisherPing === 'PONG' && subscriberPing === 'PONG';
  }

  async publish(channel: string, payload: Record<string, unknown>): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(payload));
  }

  async incrementWithWindow(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; ttlSeconds: number }> {
    const safeWindow = Math.max(1, windowSeconds);

    const script = `
      local current = redis.call('INCR', KEYS[1])
      if current == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return { current, ttl }
    `;

    const result = (await this.publisher.eval(script, 1, key, safeWindow)) as [
      number,
      number,
    ];

    return {
      count: Number(result[0]),
      ttlSeconds: Math.max(1, Number(result[1])),
    };
  }

  async subscribe(
    channel: string,
    handler: (payload: Record<string, unknown>) => void,
  ): Promise<() => Promise<void>> {
    const messageHandler = (incomingChannel: string, message: string) => {
      if (incomingChannel !== channel) return;
      try {
        const parsed = JSON.parse(message) as Record<string, unknown>;
        handler(parsed);
      } catch (error) {
        this.logger.warn(
          `Invalid JSON received on channel=${channel}: ${(error as Error).message}`,
        );
      }
    };

    this.subscriber.on('message', messageHandler);
    await this.subscriber.subscribe(channel);

    return async () => {
      this.subscriber.off('message', messageHandler);
      await this.subscriber.unsubscribe(channel);
    };
  }
}
