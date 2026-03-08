import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { TENANT_CUSTOMER_LINKING_PROVIDER } from './constants/tenant-customer.tokens';
import { NoopTenantCustomerLinkingProvider } from './providers/noop-tenant-customer-linking.provider';
import { TenantCustomerOnboardingService } from './tenant-customer-onboarding.service';
import { TenantCustomersRepository } from './tenant-customers.repository';
import { TenantCustomersService } from './tenant-customers.service';

@Module({
  imports: [PrismaModule],
  providers: [
    TenantCustomersRepository,
    TenantCustomersService,
    TenantCustomerOnboardingService,
    NoopTenantCustomerLinkingProvider,
    {
      provide: TENANT_CUSTOMER_LINKING_PROVIDER,
      useExisting: NoopTenantCustomerLinkingProvider,
    },
  ],
  exports: [
    TenantCustomersService,
    TenantCustomerOnboardingService,
    TENANT_CUSTOMER_LINKING_PROVIDER,
  ],
})
export class TenantCustomersModule {}
