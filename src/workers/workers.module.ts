import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaModule } from '@/infra/kafka/kafka.module';
import { OutboxModule } from '@/infra/outbox/outbox.module';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { OutboxPublisherWorker } from './outbox-publisher.worker';
import { PaymentSucceededConsumerWorker } from './payment-succeeded.consumer.worker';
import { ReservationExpiryWorker } from './reservation-expiry.worker';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BookingsModule,
    KafkaModule,
    OutboxModule,
  ],
  providers: [
    ReservationExpiryWorker,
    PaymentSucceededConsumerWorker,
    OutboxPublisherWorker,
  ],
  exports: [
    ReservationExpiryWorker,
    PaymentSucceededConsumerWorker,
    OutboxPublisherWorker,
  ],
})
export class WorkersModule {}
