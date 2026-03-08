import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import {
  type CreateTenantCustomerInput,
  type TenantCustomerRecord,
  fromPrismaTenantCustomerStatus,
} from './types/tenant-customer.types';

@Injectable()
export class TenantCustomersRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async findByOrgAndEmail(
    orgId: string,
    email: string,
  ): Promise<TenantCustomerRecord | null> {
    const row = await this.prisma.tenantCustomer.findUnique({
      where: {
        orgId_email: {
          orgId,
          email,
        },
      },
      select: tenantCustomerSelect,
    });

    return row ? this.mapRow(row) : null;
  }

  async findByOrgAndId(
    orgId: string,
    tenantCustomerId: string,
  ): Promise<TenantCustomerRecord | null> {
    const row = await this.prisma.tenantCustomer.findFirst({
      where: {
        id: tenantCustomerId,
        orgId,
      },
      select: tenantCustomerSelect,
    });

    return row ? this.mapRow(row) : null;
  }

  async create(
    input: CreateTenantCustomerInput,
  ): Promise<TenantCustomerRecord> {
    const row = await this.prisma.tenantCustomer.create({
      data: {
        orgId: input.orgId,
        email: input.email,
        displayName: input.displayName ?? null,
        phone: input.phone ?? null,
        metadata: (input.metadata ?? null) as never,
      },
      select: tenantCustomerSelect,
    });

    return this.mapRow(row);
  }

  async upsert(
    input: CreateTenantCustomerInput,
  ): Promise<TenantCustomerRecord> {
    const now = new Date();
    const row = await this.prisma.tenantCustomer.upsert({
      where: {
        orgId_email: {
          orgId: input.orgId,
          email: input.email,
        },
      },
      create: {
        orgId: input.orgId,
        email: input.email,
        displayName: input.displayName ?? null,
        phone: input.phone ?? null,
        metadata: (input.metadata ?? null) as never,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        displayName: input.displayName ?? undefined,
        phone: input.phone ?? undefined,
        metadata: input.metadata === undefined ? undefined : (input.metadata as never),
        lastSeenAt: now,
      },
      select: tenantCustomerSelect,
    });

    return this.mapRow(row);
  }

  async markSeen(tenantCustomerId: string): Promise<TenantCustomerRecord | null> {
    const row = await this.prisma.tenantCustomer.update({
      where: { id: tenantCustomerId },
      data: {
        lastSeenAt: new Date(),
      },
      select: tenantCustomerSelect,
    });

    return row ? this.mapRow(row) : null;
  }

  private mapRow(row: TenantCustomerRow): TenantCustomerRecord {
    return {
      id: row.id,
      orgId: row.orgId,
      email: row.email,
      displayName: row.displayName,
      phone: row.phone,
      status: fromPrismaTenantCustomerStatus(row.status),
      metadata: row.metadata,
      firstSeenAt: row.firstSeenAt,
      lastSeenAt: row.lastSeenAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

const tenantCustomerSelect = {
  id: true,
  orgId: true,
  email: true,
  displayName: true,
  phone: true,
  status: true,
  metadata: true,
  firstSeenAt: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

type TenantCustomerRow = {
  id: string;
  orgId: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  status: Parameters<typeof fromPrismaTenantCustomerStatus>[0];
  metadata: unknown;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
};
