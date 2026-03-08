import { Injectable } from '@nestjs/common';
import { TenantCustomersRepository } from './tenant-customers.repository';
import {
  type CreateTenantCustomerInput,
  type TenantCustomerRecord,
} from './types/tenant-customer.types';

@Injectable()
export class TenantCustomersService {
  constructor(
    private readonly tenantCustomersRepository: TenantCustomersRepository,
  ) {}

  findByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<TenantCustomerRecord | null> {
    return this.tenantCustomersRepository.findByOrgAndEmail(
      orgId,
      this.normalizeEmail(email),
    );
  }

  getTenantCustomerById(
    orgId: string,
    tenantCustomerId: string,
  ): Promise<TenantCustomerRecord | null> {
    return this.tenantCustomersRepository.findByOrgAndId(
      orgId,
      tenantCustomerId,
    );
  }

  createTenantCustomer(
    input: CreateTenantCustomerInput,
  ): Promise<TenantCustomerRecord> {
    return this.tenantCustomersRepository.create(this.normalizeInput(input));
  }

  upsertTenantCustomer(
    input: CreateTenantCustomerInput,
  ): Promise<TenantCustomerRecord> {
    return this.tenantCustomersRepository.upsert(this.normalizeInput(input));
  }

  markSeen(
    tenantCustomerId: string,
  ): Promise<TenantCustomerRecord | null> {
    return this.tenantCustomersRepository.markSeen(tenantCustomerId);
  }

  private normalizeInput(
    input: CreateTenantCustomerInput,
  ): CreateTenantCustomerInput {
    return {
      ...input,
      email: this.normalizeEmail(input.email),
      displayName: this.normalizeOptionalText(input.displayName),
      phone: this.normalizeOptionalText(input.phone),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
