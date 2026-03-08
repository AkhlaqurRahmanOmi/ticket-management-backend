import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { TenantSubscriptionsRepository } from './tenant-subscriptions.repository';
import { TenantSubscriptionsService } from './tenant-subscriptions.service';

@Module({
  imports: [PrismaModule],
  providers: [TenantSubscriptionsRepository, TenantSubscriptionsService],
  exports: [TenantSubscriptionsService],
})
export class TenantSubscriptionsModule {}
