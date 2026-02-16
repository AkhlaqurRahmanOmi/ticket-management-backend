import { SetMetadata } from '@nestjs/common';

export type AllowedRole = string;

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_KEY, roles);
