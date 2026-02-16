import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

@Injectable()
export class OrganizationsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findBySlug(slug: string) {
    return this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      select: { id: true },
    });
  }

  async createOrganization(input: { name: string; slug: string }) {
    try {
      return await this.prisma.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });
    } catch (error) {
      this.mapPersistenceError(error);
    }
  }
}
