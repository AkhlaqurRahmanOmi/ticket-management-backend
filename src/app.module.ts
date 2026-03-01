import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validateEnv } from './config/env.schema';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { KafkaModule } from './infra/kafka/kafka.module';
import { OutboxModule } from './infra/outbox/outbox.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { EventsModule } from './modules/events/events.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { WorkersModule } from './workers/workers.module';
import { IamModule } from './modules/iam/iam.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    KafkaModule,
    OutboxModule,
    OrganizationsModule,
    EventsModule,
    ReservationsModule,
    PaymentsModule,
    TicketsModule,
    RealtimeModule,
    WorkersModule,
    IamModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
