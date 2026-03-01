import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { RedisModule } from '@/infra/redis/redis.module';
import { IamModule } from '@/modules/iam/iam.module';
import { ManualPaymentProvider } from './provider/manual-payment.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER_REGISTRY } from './token/payments.tokens';

@Module({
  imports: [PrismaModule, JwtModule, IamModule, RedisModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    ManualPaymentProvider,
    JwtAuthGuard,
    RolesGuard,
    RateLimitGuard,
    {
      provide: PAYMENT_PROVIDER_REGISTRY,
      useFactory: (manualProvider: ManualPaymentProvider) =>
        new Map([[manualProvider.name, manualProvider]]),
      inject: [ManualPaymentProvider],
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
