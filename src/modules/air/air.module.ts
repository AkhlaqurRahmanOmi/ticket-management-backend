import { Module } from '@nestjs/common';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { TenantSubscriptionsModule } from '@/modules/tenant-subscriptions/tenant-subscriptions.module';
import { TenantRuntimeModule } from '@/modules/tenant-runtime/tenant-runtime.module';
import { AirController } from './air.controller';
import { AirReadRepository } from './repositories/air-read.repository';
import { AirService } from './air.service';

@Module({
  imports: [BookingsModule, TenantRuntimeModule, TenantSubscriptionsModule],
  controllers: [AirController],
  providers: [AirService, AirReadRepository, TenantAccessGuard],
  exports: [AirService],
})
export class AirModule {}
