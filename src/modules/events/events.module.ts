import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '@/infra/redis/redis.module';
import { IamModule } from '@/modules/iam/iam.module';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { OutboxModule } from '@/infra/outbox/outbox.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { EventReservationsController } from './event-reservations.controller';
import { EventReservationsService } from './event-reservations.service';
import { EventsController } from './events.controller';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [
    JwtModule,
    IamModule,
    OutboxModule,
    BookingsModule,
    RealtimeModule,
    RedisModule,
  ],
  controllers: [EventsController, EventReservationsController],
  providers: [
    EventsService,
    EventReservationsService,
    EventsRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
    RateLimitGuard,
  ],
  exports: [EventsService, EventReservationsService],
})
export class EventsModule {}
