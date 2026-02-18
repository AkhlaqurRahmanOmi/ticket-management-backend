import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { KafkaModule } from '@/infra/kafka/kafka.module';
import { OutboxModule } from '@/infra/outbox/outbox.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { ReservationsModule } from '@/modules/reservations/reservations.module';
import { TicketsModule } from '@/modules/tickets/tickets.module';
import { OutboxPublisherWorker } from './outbox-publisher.worker';
import { PaymentSucceededConsumerWorker } from './payment-succeeded.consumer.worker';
import { ReservationExpiryWorker } from './reservation-expiry.worker';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ReservationsModule,
    RealtimeModule,
    TicketsModule,
    KafkaModule,
    OutboxModule,
  ],
  providers: [
    ReservationExpiryWorker,
    PaymentSucceededConsumerWorker,
    OutboxPublisherWorker,
  ],
})
export class WorkersModule {}
