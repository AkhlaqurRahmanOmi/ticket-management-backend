export type ClientPolicyOverrideKey =
  | 'BOOKING_RULES'
  | 'PRICING_POLICY'
  | 'PASSENGER_POLICY'
  | 'CANCELLATION_POLICY'
  | 'NOTIFICATION_POLICY';

export type ClientPolicyOverrideToken = string | symbol | Function;

export interface ClientPolicyOverrideRegistry {
  label: string;
  overrides: Partial<Record<ClientPolicyOverrideKey, ClientPolicyOverrideToken>>;
}
