import { Module } from '@nestjs/common';
import { OutboxService } from './outbox/outbox.service';

@Module({
  providers: [OutboxService]
})
export class OutboxModule {}
