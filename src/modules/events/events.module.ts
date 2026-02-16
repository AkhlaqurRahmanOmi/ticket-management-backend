import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '@/modules/iam/iam.module';
import { OutboxModule } from '@/infra/outbox/outbox.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { EventsController } from './events.controller';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';

@Module({
  imports: [JwtModule, IamModule, OutboxModule],
  controllers: [EventsController],
  providers: [
    EventsService,
    EventsRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
  ],
})
export class EventsModule {}
