import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { IamModule } from '@/modules/iam/iam.module';
import { TenantSubscriptionsModule } from '@/modules/tenant-subscriptions/tenant-subscriptions.module';
import { TenantRuntimeModule } from '@/modules/tenant-runtime/tenant-runtime.module';
import { AirController } from './air.controller';
import { AirReadRepository } from './repositories/air-read.repository';
import { AirService } from './air.service';

@Module({
  imports: [
    BookingsModule,
    IamModule,
    TenantRuntimeModule,
    TenantSubscriptionsModule,
  ],
  controllers: [AirController],
  providers: [
    AirService,
    AirReadRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
    RateLimitGuard,
    TenantAccessGuard,
  ],
  exports: [AirService],
})
export class AirModule {}
