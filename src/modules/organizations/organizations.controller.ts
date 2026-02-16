import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AddOrgMemberDto } from '@/modules/iam/dto/add-org-member.dto';
import { CreateOrganizationDto } from '@/modules/iam/dto/create-organization.dto';
import { ORG_MEMBER_MANAGE_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
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
  @UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @CheckPolicies(ORG_MEMBER_MANAGE_POLICY)
  addOrganizationMember(
    @CurrentUser('id') actorUserId: string,
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: AddOrgMemberDto,
  ) {
    return this.organizationsService.addOrganizationMember(actorUserId, orgId, dto);
  }
}
