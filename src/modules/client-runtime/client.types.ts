export const DEFAULT_CLIENT_PROFILE = 'default';
export const ACME_EVENTS_CLIENT_PROFILE = 'acme-events';

export const CLIENT_PROFILES = [
  DEFAULT_CLIENT_PROFILE,
  ACME_EVENTS_CLIENT_PROFILE,
] as const;

export type ClientProfile = (typeof CLIENT_PROFILES)[number];

export type ClientProfileMetadata = {
  key: ClientProfile;
  label: string;
  isDefault: boolean;
  overridePackActive: boolean;
  policyOverrides: string[];
};

export const CLIENT_PROFILE_LABELS: Record<ClientProfile, string> = {
  default: 'Default Client',
  'acme-events': 'Acme Events',
};

export const isClientProfile = (value: string): value is ClientProfile =>
  CLIENT_PROFILES.includes(value as ClientProfile);
