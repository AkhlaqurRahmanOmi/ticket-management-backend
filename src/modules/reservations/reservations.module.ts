import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '@/modules/iam/iam.module';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ReservationsController } from './reservations.controller';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [PrismaModule, JwtModule, IamModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
