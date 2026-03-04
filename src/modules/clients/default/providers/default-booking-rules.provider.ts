import { Injectable } from '@nestjs/common';
import type {
  BookingRules,
  BookingRulesPolicy,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class DefaultBookingRulesProvider implements BookingRulesPolicy {
  getRules(): BookingRules {
    return {
      seatHoldTtlSeconds: 300,
      allowGuestCheckout: true,
      requirePassengerDetails: false,
    };
  }
}
