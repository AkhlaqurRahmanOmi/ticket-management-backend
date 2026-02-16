export type AuthUserMembership = {
  orgId: string;
  role: string;
};

export type AuthUser = {
  id: string;
  email?: string;
  memberships?: AuthUserMembership[];
  roles?: string[];
  permissions?: string[];
};
