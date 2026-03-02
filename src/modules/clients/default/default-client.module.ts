import { Module } from '@nestjs/common';
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
  ],
  exports: [
    DefaultBookingRulesProvider,
    DefaultPricingPolicyProvider,
    DefaultPassengerPolicyProvider,
    DefaultCancellationPolicyProvider,
    DefaultNotificationPolicyProvider,
  ],
})
export class DefaultClientModule {}
