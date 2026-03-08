/**
 * AuthUser is the authenticated global platform identity used by IAM,
 * guards, and staff/admin authorization flows. It is intentionally distinct
 * from tenant-local customer identity (`TenantCustomer`).
 */
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
