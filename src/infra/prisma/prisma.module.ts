import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { UnitOfWorkService } from './unit-of-work.service';

@Module({
  providers: [PrismaService, UnitOfWorkService],
  exports: [PrismaService, UnitOfWorkService],
})
export class PrismaModule {}
