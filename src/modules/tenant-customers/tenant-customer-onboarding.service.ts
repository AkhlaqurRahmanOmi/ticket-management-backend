import { Inject, Injectable } from '@nestjs/common';
import { TenantCustomersService } from './tenant-customers.service';
import { TENANT_CUSTOMER_LINKING_PROVIDER } from './constants/tenant-customer.tokens';
import type { TenantCustomerLinkingProvider } from './contracts/tenant-customer-linking.contract';
import type {
  TenantCustomerOnboardingInput,
  TenantCustomerOnboardingResult,
  TenantCustomerOnboardingResolution,
} from './types/tenant-customer-onboarding.types';
import type { TenantCustomerRecord } from './types/tenant-customer.types';

@Injectable()
export class TenantCustomerOnboardingService {
  constructor(
    private readonly tenantCustomersService: TenantCustomersService,
    @Inject(TENANT_CUSTOMER_LINKING_PROVIDER)
    private readonly tenantCustomerLinkingProvider: TenantCustomerLinkingProvider,
  ) {}

  async onboard(
    input: TenantCustomerOnboardingInput,
  ): Promise<TenantCustomerOnboardingResult> {
    const normalizedInput = this.normalizeInput(input);
    const existing = await this.tenantCustomersService.findByOrgAndEmail(
      normalizedInput.orgId,
      normalizedInput.email,
    );

    let resolution: TenantCustomerOnboardingResolution;
    let tenantCustomer: TenantCustomerRecord;

    if (!existing) {
      tenantCustomer = await this.tenantCustomersService.createTenantCustomer({
        orgId: normalizedInput.orgId,
        email: normalizedInput.email,
        displayName: normalizedInput.displayName,
        phone: normalizedInput.phone,
        metadata: normalizedInput.metadata,
      });
      resolution = 'created';
    } else if (this.hasMeaningfulChanges(existing, normalizedInput)) {
      tenantCustomer = await this.tenantCustomersService.upsertTenantCustomer({
        orgId: normalizedInput.orgId,
        email: normalizedInput.email,
        displayName: normalizedInput.displayName,
        phone: normalizedInput.phone,
        metadata: normalizedInput.metadata,
      });
      resolution = 'updated';
    } else {
      tenantCustomer = existing;
      resolution = 'existing';
    }

    const linking = await this.tenantCustomerLinkingProvider.resolveLink({
      orgId: normalizedInput.orgId,
      email: normalizedInput.email,
      displayName: normalizedInput.displayName,
      phone: normalizedInput.phone,
    });

    return {
      resolution,
      tenantCustomer,
      linking,
    };
  }

  private normalizeInput(
    input: TenantCustomerOnboardingInput,
  ): TenantCustomerOnboardingInput {
    return {
      ...input,
      email: input.email.trim().toLowerCase(),
      displayName: this.normalizeOptionalText(input.displayName),
      phone: this.normalizeOptionalText(input.phone),
    };
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private hasMeaningfulChanges(
    existing: TenantCustomerRecord,
    input: TenantCustomerOnboardingInput,
  ): boolean {
    return (
      existing.displayName !== (input.displayName ?? null) ||
      existing.phone !== (input.phone ?? null) ||
      this.stringifyMetadata(existing.metadata) !== this.stringifyMetadata(input.metadata)
    );
  }

  private stringifyMetadata(metadata: unknown): string {
    return JSON.stringify(metadata ?? null);
  }
}
