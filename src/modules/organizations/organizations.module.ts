import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { IamModule } from '@/modules/iam/iam.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { OrganizationsRepository } from './organizations.repository';
import { OrganizationMembersRepository } from './organization-members.repository';

@Module({
  imports: [PrismaModule, JwtModule, IamModule],
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationMembersRepository,
    JwtAuthGuard,
    RolesGuard,
    PolicyGuard,
  ],
})
export class OrganizationsModule {}
