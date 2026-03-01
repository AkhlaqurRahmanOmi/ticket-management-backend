import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  ACTIVE_BOOKING_DOMAIN,
  ACTIVE_DOMAIN_METADATA,
} from './domain.tokens';
import { DomainRuntimeService } from './domain-runtime.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DomainRuntimeService,
    {
      provide: ACTIVE_BOOKING_DOMAIN,
      useFactory: (domainRuntimeService: DomainRuntimeService) =>
        domainRuntimeService.getActiveDomain(),
      inject: [DomainRuntimeService],
    },
    {
      provide: ACTIVE_DOMAIN_METADATA,
      useFactory: (domainRuntimeService: DomainRuntimeService) =>
        domainRuntimeService.getActiveDomainMetadata(),
      inject: [DomainRuntimeService],
    },
  ],
  exports: [
    DomainRuntimeService,
    ACTIVE_BOOKING_DOMAIN,
    ACTIVE_DOMAIN_METADATA,
  ],
})
export class DomainRuntimeModule {}
