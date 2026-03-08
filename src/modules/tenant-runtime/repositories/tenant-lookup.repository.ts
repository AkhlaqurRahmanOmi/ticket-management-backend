import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';

type TenantLookupRow = {
  id: string;
  slug: string;
  name: string;
};

@Injectable()
export class TenantLookupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrganizationsByIds(
    orgIds: readonly string[],
  ): Promise<TenantLookupRow[]> {
    if (orgIds.length === 0) {
      return [];
    }

    return this.prisma.organization.findMany({
      where: {
        id: {
          in: [...orgIds],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });
  }

  async findOrganizationsBySlugs(
    slugs: readonly string[],
  ): Promise<TenantLookupRow[]> {
    if (slugs.length === 0) {
      return [];
    }

    return this.prisma.organization.findMany({
      where: {
        slug: {
          in: [...slugs],
        },
      },
      select: {
        id: true,
        slug: true,
        name: true,
      },
    });
  }
}
