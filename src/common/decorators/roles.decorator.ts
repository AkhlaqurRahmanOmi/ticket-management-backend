import { SetMetadata } from '@nestjs/common';
import type { GlobalRole, OrgRole } from '@/generated/prisma/enums';

export type AllowedRole = GlobalRole | OrgRole | string;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_KEY, roles);
