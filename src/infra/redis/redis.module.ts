import { Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

@Module({
  providers: [RedisService]
})
export class RedisModule {}
