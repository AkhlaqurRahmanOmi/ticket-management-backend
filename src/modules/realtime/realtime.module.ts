import { Module } from '@nestjs/common';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { RealtimeController } from './realtime.controller';
import { RealtimeRepository } from './realtime.repository';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeRepository, RateLimitGuard],
  exports: [RealtimeService],
})
export class RealtimeModule {}
