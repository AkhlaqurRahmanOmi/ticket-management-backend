import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DOMAIN_METADATA,
  type BookingDomain,
  type DomainMetadata,
  isBookingDomain,
} from './domain.types';

@Injectable()
export class DomainRuntimeService {
  constructor(private readonly configService: ConfigService) {}

  getActiveDomain(): BookingDomain {
    const configuredDomain = this.configService.get<string>('app.bookingDomain');
    if (isBookingDomain(configuredDomain)) {
      return configuredDomain;
    }

    return 'event';
  }

  getActiveDomainMetadata(): DomainMetadata {
    return DOMAIN_METADATA[this.getActiveDomain()];
  }

  isDomain(domain: BookingDomain): boolean {
    return this.getActiveDomain() === domain;
  }
}
