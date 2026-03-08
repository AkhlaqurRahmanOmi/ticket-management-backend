import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import type { PolicyContext, PolicyHandler } from '@/common/decorators/check-policies.decorator';
import { AUTHORIZATION_PROVIDER } from '../token/tokens';
import type { AuthorizationProvider } from './authorization-provider.contract';

const TENANT_STAFF_ROLES = new Set(['ORG_ADMIN', 'ORG_STAFF']);

function getRouteParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function getResolvedTenantOrgId(request: Request): string | null {
  return request.tenantContext?.status === 'resolved'
    ? request.tenantContext.orgId
    : null;
}

function tenantMatchesResolvedContext(request: Request, orgId: string): boolean {
  const tenantOrgId = getResolvedTenantOrgId(request);
  return !tenantOrgId || tenantOrgId === orgId;
}

function hasTenantStaffAccess(
  authz: Awaited<ReturnType<AuthorizationProvider['getUserAuthorizationContext']>>,
  orgId: string,
): boolean {
  return authz.memberships.some(
    (membership) =>
      membership.orgId === orgId && TENANT_STAFF_ROLES.has(membership.role),
  );
}

@Injectable()
export class OrgMemberManagePolicyProvider implements PolicyHandler {
  constructor(
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const orgId = getRouteParam(request.params?.orgId);
    if (!orgId) return false;
    if (!tenantMatchesResolvedContext(request, orgId)) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return authz.memberships.some(
      (membership) =>
        membership.orgId === orgId && membership.role === 'ORG_ADMIN',
    );
  }
}

@Injectable()
export class EventCreatePolicyProvider implements PolicyHandler {
  constructor(
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const orgId = this.getBodyOrgId(request.body);
    if (!orgId) return false;
    if (!tenantMatchesResolvedContext(request, orgId)) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return hasTenantStaffAccess(authz, orgId);
  }

  private getBodyOrgId(body: unknown): string | undefined {
    if (!body || typeof body !== 'object') return undefined;
    const candidate = (body as Record<string, unknown>).orgId;
    return typeof candidate === 'string' ? candidate : undefined;
  }
}

@Injectable()
export class EventManagePolicyProvider implements PolicyHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const eventId = getRouteParam(request.params?.eventId);
    if (!eventId) return false;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { orgId: true },
    });
    if (!event) return false;
    if (!tenantMatchesResolvedContext(request, event.orgId)) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return hasTenantStaffAccess(authz, event.orgId);
  }
}

@Injectable()
export class ReservationReadPolicyProvider implements PolicyHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const reservationId = getRouteParam(request.params?.reservationId);
    if (!reservationId) return false;

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        userId: true,
        event: {
          select: {
            orgId: true,
          },
        },
      },
    });
    if (!reservation?.event) return false;
    if (!tenantMatchesResolvedContext(request, reservation.event.orgId)) return false;
    if (reservation.userId === user.id) return true;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return hasTenantStaffAccess(authz, reservation.event.orgId);
  }
}

@Injectable()
export class TicketReadPolicyProvider implements PolicyHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const ticketId = getRouteParam(request.params?.ticketId);
    if (!ticketId) return false;

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        userId: true,
        event: {
          select: {
            orgId: true,
          },
        },
      },
    });
    if (!ticket?.event) return false;
    if (!tenantMatchesResolvedContext(request, ticket.event.orgId)) return false;
    if (ticket.userId === user.id) return true;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return hasTenantStaffAccess(authz, ticket.event.orgId);
  }
}

@Injectable()
export class RailHoldReadPolicyProvider implements PolicyHandler {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const holdId = getRouteParam(request.params?.holdId);
    if (!holdId) return false;

    const hold = await this.prisma.booking.findFirst({
      where: {
        id: holdId,
        domainType: 'RAIL',
      },
      select: {
        userId: true,
        orgId: true,
      },
    });

    if (!hold?.orgId) return false;
    if (!tenantMatchesResolvedContext(request, hold.orgId)) return false;
    if (hold.userId === user.id) return true;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return hasTenantStaffAccess(authz, hold.orgId);
  }
}
