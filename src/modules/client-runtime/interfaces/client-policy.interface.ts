export type BookingRules = {
  seatHoldTtlSeconds: number;
  allowGuestCheckout: boolean;
  requirePassengerDetails: boolean;
};

export interface BookingRulesPolicy {
  getRules(): BookingRules;
}

export type PriceBreakdownInput = {
  baseAmountCents: number;
  currency?: string;
};

export type PriceBreakdown = {
  baseAmountCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalAmountCents: number;
  currency: string;
};

export interface PricingPolicy {
  buildPriceBreakdown(input: PriceBreakdownInput): PriceBreakdown;
}

export type PassengerRequirements = {
  passengerRequired: boolean;
  requiredFields: string[];
  allowGuestPassengerRecords: boolean;
};

export interface PassengerPolicy {
  getRequirements(): PassengerRequirements;
}

export type CancellationRules = {
  allowHoldCancellation: boolean;
  allowConfirmedCancellation: boolean;
  refundMode: 'none' | 'manual_review';
};

export interface CancellationPolicyContract {
  getPolicy(): CancellationRules;
}

export type NotificationPreferences = {
  bookingCreated: boolean;
  paymentSucceeded: boolean;
  ticketIssued: boolean;
  cancellationConfirmed: boolean;
};

export interface NotificationPolicyContract {
  getPreferences(): NotificationPreferences;
}
