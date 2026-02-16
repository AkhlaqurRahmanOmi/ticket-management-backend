import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(input: {
    email: string;
    passwordHash: string;
    displayName?: string;
  }) {
    try {
      return this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
          displayName: input.displayName ?? null,
        },
      });
    } catch (error) {
      this.mapPersistenceError(error);
    }
  }
}
