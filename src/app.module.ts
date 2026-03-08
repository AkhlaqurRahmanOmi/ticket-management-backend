import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { env } from './config/env';
import { validateEnv } from './config/env.schema';
import { KafkaModule } from './infra/kafka/kafka.module';
import { OutboxModule } from './infra/outbox/outbox.module';
import { PrismaModule } from './infra/prisma/prisma.module';
import { RedisModule } from './infra/redis/redis.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ClientRuntimeModule } from './modules/client-runtime/client-runtime.module';
import { AirDomainModule } from './modules/domains/air-domain.module';
import { EventsDomainModule } from './modules/domains/events/events-domain.module';
import { RailDomainModule } from './modules/domains/rail/rail-domain.module';
import { DomainRuntimeModule } from './modules/domain-runtime/domain-runtime.module';
import { HealthModule } from './modules/health/health.module';
import { IamModule } from './modules/iam/iam.module';
import { IssuanceModule } from './modules/issuance/issuance.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TenantContextMiddleware } from './modules/tenant-runtime/middleware/tenant-context.middleware';
import { TenantCustomersModule } from './modules/tenant-customers/tenant-customers.module';
import { TenantRuntimeModule } from './modules/tenant-runtime/tenant-runtime.module';
import { WorkersModule } from './workers/workers.module';

const resolveDomainModules = () => {
  const bookingDomain = process.env[env.bookingDomain] ?? 'event';

  switch (bookingDomain) {
    case 'event':
      return [EventsDomainModule];
    case 'rail':
      return [RailDomainModule];
    case 'air':
      return [AirDomainModule];
    default:
      throw new Error(`Unsupported BOOKING_DOMAIN=${bookingDomain}.`);
  }
};

@Module({
  imports: [
    CommonModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    PrismaModule,
    RedisModule,
    KafkaModule,
    OutboxModule,
    DomainRuntimeModule,
    ClientRuntimeModule,
    TenantRuntimeModule,
    TenantCustomersModule,
    BookingsModule,
    IssuanceModule,
    OrganizationsModule,
    PaymentsModule,
    WorkersModule,
    IamModule,
    HealthModule,
    ...resolveDomainModules(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
