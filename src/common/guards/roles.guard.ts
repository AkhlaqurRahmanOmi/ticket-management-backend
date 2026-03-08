import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, type AllowedRole } from '@/common/decorators/roles.decorator';

const GLOBAL_ROLES = new Set(['SUPER_ADMIN', 'USER']);
const TENANT_MEMBERSHIP_ROLES = new Set(['ORG_ADMIN', 'ORG_STAFF']);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    const tenantOrgId =
      request.tenantContext?.status === 'resolved'
        ? request.tenantContext.orgId
        : null;

    const hasRequiredRole = requiredRoles.some((role) =>
      this.hasRequiredRole(user, String(role), tenantOrgId),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient role permissions.');
    }

    return true;
  }

  private hasRequiredRole(
    user: Request['user'],
    role: string,
    tenantOrgId: string | null,
  ): boolean {
    if (!tenantOrgId) {
      return this.hasLegacyRoleMatch(user, role);
    }

    if (GLOBAL_ROLES.has(role)) {
      return user?.roles?.includes(role) ?? false;
    }

    if (TENANT_MEMBERSHIP_ROLES.has(role)) {
      return (
        user?.memberships?.some(
          (membership) =>
            membership.orgId === tenantOrgId && membership.role === role,
        ) ?? false
      );
    }

    return this.hasLegacyRoleMatch(user, role);
  }

  private hasLegacyRoleMatch(user: Request['user'], role: string): boolean {
    if (user?.roles?.includes(role)) {
      return true;
    }

    return user?.memberships?.some((membership) => membership.role === role) ?? false;
  }
}
