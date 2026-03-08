export type TenantCustomerLinkingInput = {
  orgId: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
};

export type TenantCustomerLinkingResult = {
  mode: 'deferred' | 'linked' | 'not_applicable';
  platformUserId: string | null;
};

export interface TenantCustomerLinkingProvider {
  resolveLink(
    input: TenantCustomerLinkingInput,
  ): Promise<TenantCustomerLinkingResult>;
}
