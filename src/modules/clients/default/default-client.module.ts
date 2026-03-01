import { Module } from '@nestjs/common';
import {
  BOOKING_RULES,
  CANCELLATION_POLICY,
  NOTIFICATION_POLICY,
  PASSENGER_POLICY,
  PRICING_POLICY,
} from '@/modules/client-runtime/client.tokens';
import { DefaultBookingRulesProvider } from './providers/default-booking-rules.provider';
import { DefaultCancellationPolicyProvider } from './providers/default-cancellation-policy.provider';
import { DefaultNotificationPolicyProvider } from './providers/default-notification-policy.provider';
import { DefaultPassengerPolicyProvider } from './providers/default-passenger-policy.provider';
import { DefaultPricingPolicyProvider } from './providers/default-pricing-policy.provider';

@Module({
  providers: [
    DefaultBookingRulesProvider,
    DefaultPricingPolicyProvider,
    DefaultPassengerPolicyProvider,
    DefaultCancellationPolicyProvider,
    DefaultNotificationPolicyProvider,
    {
      provide: BOOKING_RULES,
      useExisting: DefaultBookingRulesProvider,
    },
    {
      provide: PRICING_POLICY,
      useExisting: DefaultPricingPolicyProvider,
    },
    {
      provide: PASSENGER_POLICY,
      useExisting: DefaultPassengerPolicyProvider,
    },
    {
      provide: CANCELLATION_POLICY,
      useExisting: DefaultCancellationPolicyProvider,
    },
    {
      provide: NOTIFICATION_POLICY,
      useExisting: DefaultNotificationPolicyProvider,
    },
  ],
  exports: [
    BOOKING_RULES,
    PRICING_POLICY,
    PASSENGER_POLICY,
    CANCELLATION_POLICY,
    NOTIFICATION_POLICY,
    DefaultBookingRulesProvider,
    DefaultPricingPolicyProvider,
    DefaultPassengerPolicyProvider,
    DefaultCancellationPolicyProvider,
    DefaultNotificationPolicyProvider,
  ],
})
export class DefaultClientModule {}
