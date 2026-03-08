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
import { RailController } from './rail.controller';
import { RailRepository } from './rail.repository';
import { RailService } from './rail.service';

@Module({
  imports: [
    BookingsModule,
    IamModule,
    TenantRuntimeModule,
    TenantSubscriptionsModule,
  ],
  controllers: [RailController],
  providers: [
    RailService,
    RailRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
    RateLimitGuard,
    TenantAccessGuard,
  ],
  exports: [RailService],
})
export class RailModule {}
