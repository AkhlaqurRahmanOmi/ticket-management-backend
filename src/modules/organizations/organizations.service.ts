import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DomainRuntimeService } from '@/modules/domain-runtime/domain-runtime.service';
import { AddOrgMemberDto } from '@/modules/iam/dto/add-org-member.dto';
import { CreateOrganizationDto } from '@/modules/iam/dto/create-organization.dto';
import type { AuthorizationProvider } from '@/modules/iam/provider/authorization/authorization-provider.contract';
import type { RoleAssignmentProvider } from '@/modules/iam/provider/authorization/role-assignment.provider.contract';
import {
  AUTHORIZATION_PROVIDER,
  ROLE_ASSIGNMENT_PROVIDER,
} from '@/modules/iam/provider/token/tokens';
import { CreateTenantSubscriptionDto } from '@/modules/tenant-subscriptions/dto/create-tenant-subscription.dto';
import { UpdateTenantSubscriptionDto } from '@/modules/tenant-subscriptions/dto/update-tenant-subscription.dto';
import { TenantSubscriptionsService } from '@/modules/tenant-subscriptions/tenant-subscriptions.service';
import { OrganizationMembersRepository } from './organization-members.repository';
import { OrganizationsRepository } from './organizations.repository';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly organizationMembersRepository: OrganizationMembersRepository,
    private readonly tenantSubscriptionsService: TenantSubscriptionsService,
    private readonly domainRuntimeService: DomainRuntimeService,
    @Inject(ROLE_ASSIGNMENT_PROVIDER)
    private readonly roleAssignmentProvider: RoleAssignmentProvider,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async createOrganization(actorUserId: string, dto: CreateOrganizationDto) {
    const existingOrg = await this.organizationsRepository.findBySlug(dto.slug);
    if (existingOrg) {
      throw new BadRequestException('Organization slug already exists.');
    }

    const organization = await this.organizationsRepository.createOrganization({
      name: dto.name,
      slug: dto.slug,
    });

    await this.organizationMembersRepository.createOrgAdminMembership(
      organization.id,
      actorUserId,
    );

    await this.tenantSubscriptionsService.enableSubscription(
      organization.id,
      this.domainRuntimeService.getActiveDomain(),
    );

    await this.roleAssignmentProvider.assignRoleByName(actorUserId, 'ORG_ADMIN');

    return organization;
  }

  async addOrganizationMember(
    actorUserId: string,
    orgId: string,
    dto: AddOrgMemberDto,
  ) {
    const org = await this.organizationsRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }

    const actorAuthz =
      await this.authorizationProvider.getUserAuthorizationContext(actorUserId);
    const isSuperAdmin = actorAuthz.roles.includes('SUPER_ADMIN');
    const isOrgAdmin = actorAuthz.memberships.some(
      (membership) => membership.orgId === orgId && membership.role === 'ORG_ADMIN',
    );
    if (!isSuperAdmin && !isOrgAdmin) {
      throw new BadRequestException('Only org admin can add members.');
    }

    const memberUser = await this.organizationMembersRepository.findUserById(
      dto.userId,
    );
    if (!memberUser) {
      throw new NotFoundException('User not found.');
    }

    await this.organizationMembersRepository.upsertMembership({
      orgId,
      userId: dto.userId,
      role: dto.role,
    });

    await this.roleAssignmentProvider.assignRoleByName(dto.userId, dto.role);

    return {
      orgId,
      userId: dto.userId,
      role: dto.role,
    };
  }

  async listTenantSubscriptions(orgId: string) {
    await this.assertOrganizationExists(orgId);
    return this.tenantSubscriptionsService.listSubscriptions(orgId);
  }

  async createTenantSubscription(
    orgId: string,
    dto: CreateTenantSubscriptionDto,
  ) {
    await this.assertOrganizationExists(orgId);
    return this.tenantSubscriptionsService.createSubscription(orgId, dto);
  }

  async updateTenantSubscription(
    orgId: string,
    domain: string,
    dto: UpdateTenantSubscriptionDto,
  ) {
    await this.assertOrganizationExists(orgId);
    return this.tenantSubscriptionsService.updateSubscription(orgId, domain, dto);
  }

  private async assertOrganizationExists(orgId: string) {
    const org = await this.organizationsRepository.findById(orgId);
    if (!org) {
      throw new NotFoundException('Organization not found.');
    }
  }
}
