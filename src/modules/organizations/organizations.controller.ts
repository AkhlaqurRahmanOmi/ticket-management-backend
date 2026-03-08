import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantAccess } from '@/common/decorators/tenant-access.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { AddOrgMemberDto } from '@/modules/iam/dto/add-org-member.dto';
import { CreateOrganizationDto } from '@/modules/iam/dto/create-organization.dto';
import { ORG_MEMBER_MANAGE_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateTenantSubscriptionDto } from '@/modules/tenant-subscriptions/dto/create-tenant-subscription.dto';
import { UpdateTenantSubscriptionDto } from '@/modules/tenant-subscriptions/dto/update-tenant-subscription.dto';
import { OrganizationsService } from './organizations.service';

@Controller('orgs')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  createOrganization(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.createOrganization(userId, dto);
  }

  @Post(':orgId/members')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({ requireResolvedTenant: true })
  @CheckPolicies(ORG_MEMBER_MANAGE_POLICY)
  addOrganizationMember(
    @CurrentUser('id') actorUserId: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AddOrgMemberDto,
  ) {
    return this.organizationsService.addOrganizationMember(actorUserId, orgId, dto);
  }

  @Get(':orgId/subscriptions')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({ requireResolvedTenant: true })
  @CheckPolicies(ORG_MEMBER_MANAGE_POLICY)
  listTenantSubscriptions(@Param('orgId', ParseUUIDPipe) orgId: string) {
    return this.organizationsService.listTenantSubscriptions(orgId);
  }

  @Post(':orgId/subscriptions')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({ requireResolvedTenant: true })
  @CheckPolicies(ORG_MEMBER_MANAGE_POLICY)
  createTenantSubscription(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateTenantSubscriptionDto,
  ) {
    return this.organizationsService.createTenantSubscription(orgId, dto);
  }

  @Patch(':orgId/subscriptions/:domain')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({ requireResolvedTenant: true })
  @CheckPolicies(ORG_MEMBER_MANAGE_POLICY)
  updateTenantSubscription(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('domain') domain: string,
    @Body() dto: UpdateTenantSubscriptionDto,
  ) {
    return this.organizationsService.updateTenantSubscription(orgId, domain, dto);
  }
}
