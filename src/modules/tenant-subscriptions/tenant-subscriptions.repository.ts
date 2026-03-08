import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import type { BookingDomain } from '@/modules/domain-runtime/domain.types';
import {
  TenantDomainSubscriptionStatus as PrismaTenantDomainSubscriptionStatus,
} from '@/generated/prisma/enums';
import {
  type TenantSubscriptionRecord,
  type TenantSubscriptionStatus,
  fromPrismaBookingDomain,
  fromPrismaTenantSubscriptionStatus,
  toPrismaBookingDomain,
  toPrismaTenantSubscriptionStatus,
} from './types/tenant-subscription.types';

@Injectable()
export class TenantSubscriptionsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async listByOrgId(orgId: string): Promise<TenantSubscriptionRecord[]> {
    const rows = await this.prisma.tenantDomainSubscription.findMany({
      where: { orgId },
      orderBy: [{ createdAt: 'asc' }, { domain: 'asc' }],
      select: {
        id: true,
        orgId: true,
        domain: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        activatedAt: true,
        disabledAt: true,
      },
    });

    return rows.map((row) => this.mapRow(row));
  }

  async upsertActiveSubscription(
    orgId: string,
    domain: BookingDomain,
  ): Promise<TenantSubscriptionRecord> {
    const now = new Date();
    const row = await this.prisma.tenantDomainSubscription.upsert({
      where: {
        orgId_domain: {
          orgId,
          domain: toPrismaBookingDomain(domain),
        },
      },
      update: {
        status: PrismaTenantDomainSubscriptionStatus.ACTIVE,
        activatedAt: now,
        disabledAt: null,
      },
      create: {
        orgId,
        domain: toPrismaBookingDomain(domain),
        status: PrismaTenantDomainSubscriptionStatus.ACTIVE,
        activatedAt: now,
      },
      select: {
        id: true,
        orgId: true,
        domain: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        activatedAt: true,
        disabledAt: true,
      },
    });

    return this.mapRow(row);
  }

  async updateSubscriptionStatus(
    orgId: string,
    domain: BookingDomain,
    status: TenantSubscriptionStatus,
  ): Promise<TenantSubscriptionRecord | null> {
    const existing = await this.prisma.tenantDomainSubscription.findUnique({
      where: {
        orgId_domain: {
          orgId,
          domain: toPrismaBookingDomain(domain),
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    const now = new Date();
    const prismaStatus = toPrismaTenantSubscriptionStatus(status);
    const row = await this.prisma.tenantDomainSubscription.update({
      where: { id: existing.id },
      data: {
        status: prismaStatus,
        activatedAt:
          prismaStatus === PrismaTenantDomainSubscriptionStatus.ACTIVE
            ? now
            : undefined,
        disabledAt:
          prismaStatus === PrismaTenantDomainSubscriptionStatus.DISABLED
            ? now
            : null,
      },
      select: {
        id: true,
        orgId: true,
        domain: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        activatedAt: true,
        disabledAt: true,
      },
    });

    return this.mapRow(row);
  }

  async isDomainEnabled(orgId: string, domain: BookingDomain): Promise<boolean> {
    const row = await this.prisma.tenantDomainSubscription.findUnique({
      where: {
        orgId_domain: {
          orgId,
          domain: toPrismaBookingDomain(domain),
        },
      },
      select: { status: true },
    });

    return row?.status === PrismaTenantDomainSubscriptionStatus.ACTIVE;
  }

  async listEnabledDomains(orgId: string): Promise<BookingDomain[]> {
    const rows = await this.prisma.tenantDomainSubscription.findMany({
      where: {
        orgId,
        status: PrismaTenantDomainSubscriptionStatus.ACTIVE,
      },
      orderBy: { domain: 'asc' },
      select: { domain: true },
    });

    return rows.map((row) => fromPrismaBookingDomain(row.domain));
  }

  private mapRow(row: {
    id: string;
    orgId: string;
    domain: ReturnType<typeof toPrismaBookingDomain>;
    status: PrismaTenantDomainSubscriptionStatus;
    createdAt: Date;
    updatedAt: Date;
    activatedAt: Date;
    disabledAt: Date | null;
  }): TenantSubscriptionRecord {
    return {
      id: row.id,
      orgId: row.orgId,
      domain: fromPrismaBookingDomain(row.domain),
      status: fromPrismaTenantSubscriptionStatus(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      activatedAt: row.activatedAt,
      disabledAt: row.disabledAt,
    };
  }
}
