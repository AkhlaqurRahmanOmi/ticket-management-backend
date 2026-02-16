import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamModule } from '@/modules/iam/iam.module';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [JwtModule, IamModule],
  controllers: [TicketsController],
  providers: [TicketsService, JwtAuthGuard, PolicyGuard],
})
export class TicketsModule {}
