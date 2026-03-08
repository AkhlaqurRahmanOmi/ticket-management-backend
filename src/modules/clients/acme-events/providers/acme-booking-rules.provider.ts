import { Injectable } from '@nestjs/common';
import type {
  BookingRules,
  BookingRulesPolicy,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class AcmeBookingRulesProvider implements BookingRulesPolicy {
  getRules(): BookingRules {
    return {
      seatHoldTtlSeconds: 600,
      allowGuestCheckout: false,
      requirePassengerDetails: false,
    };
  }
}
