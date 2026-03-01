import { Injectable } from '@nestjs/common';

export type DefaultBookingRules = {
  seatHoldTtlSeconds: number;
  allowGuestCheckout: boolean;
  requirePassengerDetails: boolean;
};

@Injectable()
export class DefaultBookingRulesProvider {
  getRules(): DefaultBookingRules {
    return {
      seatHoldTtlSeconds: 900,
      allowGuestCheckout: true,
      requirePassengerDetails: false,
    };
  }
}
