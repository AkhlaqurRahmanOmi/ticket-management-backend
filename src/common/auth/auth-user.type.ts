import type { GlobalRole, OrgRole } from '@/generated/prisma/enums';

export type AuthUserMembership = {
  orgId: string;
  role: OrgRole | string;
};

export type AuthUser = {
  id: string;
  email?: string;
  globalRole?: GlobalRole | string;
  memberships?: AuthUserMembership[];
  roles?: string[];
  permissions?: string[];
};
