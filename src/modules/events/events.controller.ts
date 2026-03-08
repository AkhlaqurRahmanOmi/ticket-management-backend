import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantAccess } from '@/common/decorators/tenant-access.decorator';
import { TenantHeaderDoc } from '@/common/decorators/tenant-header-doc.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import {
  EVENT_CREATE_POLICY,
  EVENT_MANAGE_POLICY,
} from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';
import { GetEventSeatsQueryDto } from './dto/get-event-seats.query.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Event Booking')
@ApiBearerAuth('access-token')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @CheckPolicies(EVENT_CREATE_POLICY)
  createEvent(
    @CurrentUser('id') actorUserId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(actorUserId, tenantOrgId, dto);
  }

  @Patch(':eventId')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @CheckPolicies(EVENT_MANAGE_POLICY)
  updateEvent(
    @CurrentUser('id') actorUserId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(actorUserId, tenantOrgId, eventId, dto);
  }

  @Post(':eventId/seats/sync')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @CheckPolicies(EVENT_MANAGE_POLICY)
  syncEventSeats(
    @CurrentUser('id') actorUserId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.eventsService.syncEventSeats(actorUserId, tenantOrgId, eventId);
  }

  @Get(':eventId/seats')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('USER', 'ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  getEventSeats(
    @CurrentTenant('orgId') tenantOrgId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: GetEventSeatsQueryDto,
  ) {
    return this.eventsService.getEventSeats(tenantOrgId, eventId, query);
  }
}
