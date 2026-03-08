import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { IssuanceRepository } from './issuance.repository';
import { IssuanceService } from './issuance.service';

@Module({
  imports: [PrismaModule],
  providers: [IssuanceService, IssuanceRepository],
  exports: [IssuanceService, IssuanceRepository],
})
export class IssuanceModule {}
