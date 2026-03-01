import { Module } from '@nestjs/common';
import { KafkaModule } from '@/infra/kafka/kafka.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { WorkersModule } from '@/workers/workers.module';
import { HealthController } from './health.controller';
import { HealthProvider } from './providers/health.provider';

@Module({
  imports: [PrismaModule, RedisModule, KafkaModule, WorkersModule],
  controllers: [HealthController],
  providers: [HealthProvider],
})
export class HealthModule {}
