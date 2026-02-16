import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import {
  TransactionOptions,
  UnitOfWorkService,
} from '@/infra/prisma/unit-of-work.service';

export type PaginationQuery = {
  page?: number;
  limit?: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
};

type PrismaKnownErrorLike = {
  code?: string;
  meta?: unknown;
  message?: string;
};

export abstract class BaseRepository {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly unitOfWork?: UnitOfWorkService,
  ) {}

  protected getPagination(query?: PaginationQuery): {
    skip: number;
    take: number;
    page: number;
    limit: number;
  } {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.max(1, Math.min(100, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    return { skip, take: limit, page, limit };
  }

  protected buildPaginationMeta(
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta {
    return {
      page,
      limit,
      total,
      hasNext: page * limit < total,
    };
  }

  protected async withTransaction<T>(
    callback: (tx: PrismaService) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    if (this.unitOfWork) {
      return this.unitOfWork.transaction(
        async (tx) => callback(tx as PrismaService),
        options,
      );
    }
    const prismaWithTransaction = this.prisma as PrismaService & {
      $transaction?: (
        cb: (tx: PrismaService) => Promise<T>,
        txOptions?: TransactionOptions,
      ) => Promise<T>;
    };

    if (typeof prismaWithTransaction.$transaction === 'function') {
      return prismaWithTransaction.$transaction(
        (tx) => callback(tx as PrismaService),
        options,
      );
    }

    return callback(this.prisma);
  }

  protected mapPersistenceError(error: unknown): never {
    const prismaError = error as PrismaKnownErrorLike;

    if (prismaError?.code === 'P2002') {
      throw new ConflictException('Unique constraint violation');
    }

    throw new InternalServerErrorException('Persistence layer error');
  }
}
