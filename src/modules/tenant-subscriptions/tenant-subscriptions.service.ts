import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isBookingDomain,
  type BookingDomain,
} from '@/modules/domain-runtime/domain.types';
import { CreateTenantSubscriptionDto } from './dto/create-tenant-subscription.dto';
import { UpdateTenantSubscriptionDto } from './dto/update-tenant-subscription.dto';
import {
  isTenantSubscriptionStatus,
  type TenantSubscriptionStatus,
} from './types/tenant-subscription.types';
import { TenantSubscriptionsRepository } from './tenant-subscriptions.repository';

@Injectable()
export class TenantSubscriptionsService {
  constructor(
    private readonly tenantSubscriptionsRepository: TenantSubscriptionsRepository,
  ) {}

  listSubscriptions(orgId: string) {
    return this.tenantSubscriptionsRepository.listByOrgId(orgId);
  }

  enableSubscription(orgId: string, domain: BookingDomain) {
    return this.tenantSubscriptionsRepository.upsertActiveSubscription(
      orgId,
      domain,
    );
  }

  createSubscription(orgId: string, dto: CreateTenantSubscriptionDto) {
    return this.enableSubscription(orgId, dto.domain);
  }

  async updateSubscription(
    orgId: string,
    domain: string,
    dto: UpdateTenantSubscriptionDto,
  ) {
    const normalizedDomain = this.parseDomain(domain);
    const normalizedStatus = this.parseStatus(dto.status);

    const updated = await this.tenantSubscriptionsRepository.updateSubscriptionStatus(
      orgId,
      normalizedDomain,
      normalizedStatus,
    );

    if (!updated) {
      throw new NotFoundException('Tenant subscription not found.');
    }

    return updated;
  }

  isDomainEnabled(orgId: string, domain: BookingDomain) {
    return this.tenantSubscriptionsRepository.isDomainEnabled(orgId, domain);
  }

  listEnabledDomains(orgId: string) {
    return this.tenantSubscriptionsRepository.listEnabledDomains(orgId);
  }

  private parseDomain(domain: string): BookingDomain {
    const normalized = domain.trim().toLowerCase();
    if (!isBookingDomain(normalized)) {
      throw new BadRequestException('Invalid tenant subscription domain.');
    }

    return normalized;
  }

  private parseStatus(status: string): TenantSubscriptionStatus {
    const normalized = status.trim().toLowerCase();
    if (!isTenantSubscriptionStatus(normalized)) {
      throw new BadRequestException('Invalid tenant subscription status.');
    }

    return normalized;
  }
}
