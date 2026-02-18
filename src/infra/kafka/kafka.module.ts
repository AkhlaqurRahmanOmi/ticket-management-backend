import { Module } from '@nestjs/common';
import { KafkaService } from './kafka/kafka.service';

@Module({
  providers: [KafkaService],
  exports: [KafkaService],
})
export class KafkaModule {}
