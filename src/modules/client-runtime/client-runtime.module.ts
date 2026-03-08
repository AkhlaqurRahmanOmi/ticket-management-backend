import { Global, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { env } from '@/config/env';
import { AcmeEventsClientModule } from '@/modules/clients/acme-events/acme-events-client.module';
import { ConfigModule } from '@nestjs/config';
import { DefaultClientModule } from '@/modules/clients/default/default-client.module';
import { DefaultBookingRulesProvider } from '@/modules/clients/default/providers/default-booking-rules.provider';
import { DefaultCancellationPolicyProvider } from '@/modules/clients/default/providers/default-cancellation-policy.provider';
import { DefaultNotificationPolicyProvider } from '@/modules/clients/default/providers/default-notification-policy.provider';
import { DefaultPassengerPolicyProvider } from '@/modules/clients/default/providers/default-passenger-policy.provider';
import { DefaultPricingPolicyProvider } from '@/modules/clients/default/providers/default-pricing-policy.provider';
import {
  ACTIVE_CLIENT_METADATA,
  ACTIVE_CLIENT_PROFILE,
  BOOKING_RULES,
  CANCELLATION_POLICY,
  CLIENT_POLICY_OVERRIDE_REGISTRY,
  NOTIFICATION_POLICY,
  PASSENGER_POLICY,
  PRICING_POLICY,
} from './client.tokens';
import { ClientRuntimeService } from './client-runtime.service';
import { DEFAULT_CLIENT_PROFILE } from './client.types';
import type {
  ClientPolicyOverrideKey,
  ClientPolicyOverrideRegistry,
} from './interfaces/client-policy-override-registry.interface';

const resolveClientModules = () => {
  const configuredProfile = process.env[env.clientProfile]?.trim();
  const activeClientProfile =
    configuredProfile && configuredProfile.length > 0
      ? configuredProfile
      : DEFAULT_CLIENT_PROFILE;

  switch (activeClientProfile) {
    case DEFAULT_CLIENT_PROFILE:
      return [];
    case 'acme-events':
      return [AcmeEventsClientModule];
    default:
      throw new Error(
        `CLIENT_PROFILE=${activeClientProfile} is configured, but its client pack is not wired yet.`,
      );
  }
};

const resolveClientPolicyProvider = <T>(
  moduleRef: ModuleRef,
  policyKey: ClientPolicyOverrideKey,
  defaultProvider: T,
): T => {
  const overrideRegistry = getOptionalProvider<ClientPolicyOverrideRegistry>(
    moduleRef,
    CLIENT_POLICY_OVERRIDE_REGISTRY,
  );
  const overrideToken = overrideRegistry?.overrides[policyKey];

  if (overrideToken) {
    return (getOptionalProvider<T>(moduleRef, overrideToken as never) ??
      defaultProvider) as T;
  }

  return defaultProvider;
};

const getOptionalProvider = <T>(
  moduleRef: ModuleRef,
  token: string | symbol | Function,
): T | null => {
  try {
    return moduleRef.get<T>(token as never, { strict: false }) ?? null;
  } catch {
    return null;
  }
};

@Global()
@Module({
  imports: [ConfigModule, DefaultClientModule, ...resolveClientModules()],
  providers: [
    ClientRuntimeService,
    {
      provide: ACTIVE_CLIENT_PROFILE,
      useFactory: (clientRuntimeService: ClientRuntimeService) =>
        clientRuntimeService.getClientProfile(),
      inject: [ClientRuntimeService],
    },
    {
      provide: ACTIVE_CLIENT_METADATA,
      useFactory: (clientRuntimeService: ClientRuntimeService) =>
        clientRuntimeService.getClientProfileMetadata(),
      inject: [ClientRuntimeService],
    },
    {
      provide: BOOKING_RULES,
      useFactory: (
        moduleRef: ModuleRef,
        defaultProvider: DefaultBookingRulesProvider,
      ) => resolveClientPolicyProvider(moduleRef, 'BOOKING_RULES', defaultProvider),
      inject: [ModuleRef, DefaultBookingRulesProvider],
    },
    {
      provide: PRICING_POLICY,
      useFactory: (
        moduleRef: ModuleRef,
        defaultProvider: DefaultPricingPolicyProvider,
      ) => resolveClientPolicyProvider(moduleRef, 'PRICING_POLICY', defaultProvider),
      inject: [ModuleRef, DefaultPricingPolicyProvider],
    },
    {
      provide: PASSENGER_POLICY,
      useFactory: (
        moduleRef: ModuleRef,
        defaultProvider: DefaultPassengerPolicyProvider,
      ) => resolveClientPolicyProvider(moduleRef, 'PASSENGER_POLICY', defaultProvider),
      inject: [ModuleRef, DefaultPassengerPolicyProvider],
    },
    {
      provide: CANCELLATION_POLICY,
      useFactory: (
        moduleRef: ModuleRef,
        defaultProvider: DefaultCancellationPolicyProvider,
      ) =>
        resolveClientPolicyProvider(
          moduleRef,
          'CANCELLATION_POLICY',
          defaultProvider,
        ),
      inject: [ModuleRef, DefaultCancellationPolicyProvider],
    },
    {
      provide: NOTIFICATION_POLICY,
      useFactory: (
        moduleRef: ModuleRef,
        defaultProvider: DefaultNotificationPolicyProvider,
      ) =>
        resolveClientPolicyProvider(
          moduleRef,
          'NOTIFICATION_POLICY',
          defaultProvider,
        ),
      inject: [ModuleRef, DefaultNotificationPolicyProvider],
    },
  ],
  exports: [
    ClientRuntimeService,
    ACTIVE_CLIENT_PROFILE,
    ACTIVE_CLIENT_METADATA,
    BOOKING_RULES,
    PRICING_POLICY,
    PASSENGER_POLICY,
    CANCELLATION_POLICY,
    NOTIFICATION_POLICY,
  ],
})
export class ClientRuntimeModule {}
