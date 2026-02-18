import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { IamModule } from '@/modules/iam/iam.module';
import { ManualPaymentProvider } from './provider/manual-payment.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDER_REGISTRY } from './token/payments.tokens';

@Module({
  imports: [PrismaModule, JwtModule, IamModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    ManualPaymentProvider,
    JwtAuthGuard,
    RolesGuard,
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
