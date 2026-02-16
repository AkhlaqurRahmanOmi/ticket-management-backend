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

    const userRoles = new Set<string>();
    user.roles?.forEach((role) => userRoles.add(role));
    user.memberships?.forEach((membership) => userRoles.add(membership.role));

    const hasRequiredRole = requiredRoles.some((role) =>
      userRoles.has(String(role)),
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('Insufficient role permissions.');
    }

    return true;
  }
}
