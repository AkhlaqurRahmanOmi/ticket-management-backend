import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '@/modules/iam/iam.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RealtimeModule } from '@/modules/realtime/realtime.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { MeTicketsController } from './me-tickets.controller';
import { TicketsController } from './tickets.controller';
import { TicketsRepository } from './tickets.repository';
import { TicketsService } from './tickets.service';
import { TenantRuntimeModule } from '@/modules/tenant-runtime/tenant-runtime.module';
import { TenantSubscriptionsModule } from '@/modules/tenant-subscriptions/tenant-subscriptions.module';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';

@Module({
  imports: [PrismaModule, JwtModule, IamModule, RealtimeModule, TenantRuntimeModule, TenantSubscriptionsModule],
  controllers: [TicketsController, MeTicketsController],
  providers: [
    TicketsService,
    TicketsRepository,
    JwtAuthGuard,
    PolicyGuard,
    RolesGuard,
    TenantAccessGuard
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
