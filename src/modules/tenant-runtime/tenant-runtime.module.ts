import { Global, Module } from '@nestjs/common';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { TenantSubscriptionsModule } from '@/modules/tenant-subscriptions/tenant-subscriptions.module';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { TenantLookupRepository } from './repositories/tenant-lookup.repository';
import { TenantRuntimeService } from './tenant-runtime.service';

@Global()
@Module({
  imports: [PrismaModule, TenantSubscriptionsModule],
  providers: [
    TenantRuntimeService,
    TenantLookupRepository,
    TenantContextMiddleware,
    TenantAccessGuard,
  ],
  exports: [TenantRuntimeService, TenantContextMiddleware, TenantAccessGuard],
})
export class TenantRuntimeModule {}
