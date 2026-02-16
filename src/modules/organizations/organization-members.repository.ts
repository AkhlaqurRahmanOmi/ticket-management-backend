import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

@Injectable()
export class OrganizationMembersRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  }

  async createOrgAdminMembership(orgId: string, userId: string) {
    try {
      await this.prisma.organizationMember.create({
        data: {
          orgId,
          userId,
          role: 'ORG_ADMIN',
        },
      });
    } catch (error) {
      this.mapPersistenceError(error);
    }
  }

  async upsertMembership(input: { orgId: string; userId: string; role: string }) {
    try {
      await this.prisma.organizationMember.upsert({
        where: {
          orgId_userId: {
            orgId: input.orgId,
            userId: input.userId,
          },
        },
        update: {
          role: input.role as never,
        },
        create: {
          orgId: input.orgId,
          userId: input.userId,
          role: input.role as never,
        },
      });
    } catch (error) {
      this.mapPersistenceError(error);
    }
  }
}
