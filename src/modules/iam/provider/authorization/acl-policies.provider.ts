import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import type { PolicyContext, PolicyHandler } from '@/common/decorators/check-policies.decorator';
import { ACL_PROVIDER, AUTHORIZATION_PROVIDER } from '../token/tokens';
import type { AclProvider } from './acl-provider.contract';
import type { AuthorizationProvider } from './authorization-provider.contract';

@Injectable()
export class OrgMemberManagePolicyProvider implements PolicyHandler {
  constructor(
    @Inject(ACL_PROVIDER) private readonly aclProvider: AclProvider,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async handle({ user, request }: PolicyContext): Promise<boolean> {
    const orgId = this.getRouteParam(request.params?.orgId);
    if (!orgId) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    const isMember = await this.aclProvider.isOrganizationMember(user.id, orgId);
    if (!isMember) return false;

    return authz.memberships.some(
      (membership) =>
        membership.orgId === orgId && membership.role === 'ORG_ADMIN',
    );
  }

  private getRouteParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
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
    const eventId = this.getRouteParam(request.params?.eventId);
    if (!eventId) return false;

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { orgId: true },
    });
    if (!event) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return authz.memberships.some(
      (membership) =>
        membership.orgId === event.orgId &&
        ['ORG_ADMIN', 'ORG_STAFF'].includes(membership.role),
    );
  }

  private getRouteParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
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
    const reservationId = this.getRouteParam(request.params?.reservationId);
    if (!reservationId) return false;

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { userId: true, eventId: true },
    });
    if (!reservation) return false;
    if (reservation.userId === user.id) return true;

    const event = await this.prisma.event.findUnique({
      where: { id: reservation.eventId },
      select: { orgId: true },
    });
    if (!event) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return authz.memberships.some(
      (membership) =>
        membership.orgId === event.orgId &&
        ['ORG_ADMIN', 'ORG_STAFF'].includes(membership.role),
    );
  }

  private getRouteParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
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
    const ticketId = this.getRouteParam(request.params?.ticketId);
    if (!ticketId) return false;

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { userId: true, eventId: true },
    });
    if (!ticket) return false;
    if (ticket.userId === user.id) return true;

    const event = await this.prisma.event.findUnique({
      where: { id: ticket.eventId },
      select: { orgId: true },
    });
    if (!event) return false;

    const authz = await this.authorizationProvider.getUserAuthorizationContext(
      user.id,
    );
    if (authz.roles.includes('SUPER_ADMIN')) return true;

    return authz.memberships.some(
      (membership) =>
        membership.orgId === event.orgId &&
        ['ORG_ADMIN', 'ORG_STAFF'].includes(membership.role),
    );
  }

  private getRouteParam(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
  }
}
