/**
 * UserMembership is derived from OrganizationMember and represents tenant
 * membership for the authenticated global User. It does not represent a
 * tenant-local customer relationship.
 */
export type UserMembership = {
  orgId: string;
  role: string;
};

/**
 * UserAuthorizationContext is the authorization payload for the authenticated
 * global User only. Customer-side tenant identity is modeled separately via
 * TenantCustomer and must not be mixed into this contract.
 */
export type UserAuthorizationContext = {
  roles: string[];
  permissions: string[];
  memberships: UserMembership[];
};

export interface AuthorizationProvider {
  getUserAuthorizationContext(userId: string): Promise<UserAuthorizationContext>;
}
