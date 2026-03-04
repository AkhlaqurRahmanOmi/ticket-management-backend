import { Module } from '@nestjs/common';
import { CLIENT_POLICY_OVERRIDE_REGISTRY } from '@/modules/client-runtime/client.tokens';
import type { ClientPolicyOverrideRegistry } from '@/modules/client-runtime/interfaces/client-policy-override-registry.interface';
import { AcmeBookingRulesProvider } from './providers/acme-booking-rules.provider';
import { AcmeNotificationPolicyProvider } from './providers/acme-notification-policy.provider';
import { AcmePricingPolicyProvider } from './providers/acme-pricing-policy.provider';

const acmeEventsPolicyOverrideRegistry: ClientPolicyOverrideRegistry = {
  label: 'Acme Events',
  overrides: {
    BOOKING_RULES: AcmeBookingRulesProvider,
    PRICING_POLICY: AcmePricingPolicyProvider,
    NOTIFICATION_POLICY: AcmeNotificationPolicyProvider,
  },
};

@Module({
  providers: [
    AcmeBookingRulesProvider,
    AcmePricingPolicyProvider,
    AcmeNotificationPolicyProvider,
    {
      provide: CLIENT_POLICY_OVERRIDE_REGISTRY,
      useValue: acmeEventsPolicyOverrideRegistry,
    },
  ],
  exports: [
    AcmeBookingRulesProvider,
    AcmePricingPolicyProvider,
    AcmeNotificationPolicyProvider,
    CLIENT_POLICY_OVERRIDE_REGISTRY,
  ],
})
export class AcmeEventsClientModule {}
