export type UserMembership = {
  orgId: string;
  role: string;
};

export type UserAuthorizationContext = {
  roles: string[];
  permissions: string[];
  memberships: UserMembership[];
};

export interface AuthorizationProvider {
  getUserAuthorizationContext(userId: string): Promise<UserAuthorizationContext>;
}
