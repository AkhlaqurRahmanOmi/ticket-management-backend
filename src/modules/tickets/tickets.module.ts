import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '@/modules/iam/iam.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { MeTicketsController } from './me-tickets.controller';
import { PaymentSucceededConsumer } from './payment-succeeded.consumer';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule, JwtModule, IamModule, RealtimeModule],
  controllers: [TicketsController, MeTicketsController],
  providers: [
    TicketsService,
    TicketsRepository,
    PaymentSucceededConsumer,
    JwtAuthGuard,
    PolicyGuard,
    RolesGuard,
  ],
  exports: [TicketsService, PaymentSucceededConsumer],
})
export class TicketsModule {}
