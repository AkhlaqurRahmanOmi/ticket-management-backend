import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantAccess } from '@/common/decorators/tenant-access.decorator';
import { TenantHeaderDoc } from '@/common/decorators/tenant-header-doc.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { RESERVATION_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateEventReservationDto } from './dto/create-event-reservation.dto';
import { EventReservationsService } from './event-reservations.service';

@ApiTags('Event Booking')
@ApiBearerAuth('access-token')
@Controller('reservations')
export class EventReservationsController {
  constructor(
    private readonly eventReservationsService: EventReservationsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, RateLimitGuard)
  @Roles('USER')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @RateLimit({ limit: 15, windowSeconds: 60, keyPrefix: 'reservations:create' })
  createReservation(
    @CurrentUser('id') userId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
    @Body() dto: CreateEventReservationDto,
    @Req() request: Request,
  ) {
    return this.eventReservationsService.createReservation(
      userId,
      tenantOrgId,
      dto,
      request.requestId,
    );
  }

  @Get(':reservationId')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('USER', 'ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @CheckPolicies(RESERVATION_READ_POLICY)
  getReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string) {
    return this.eventReservationsService.getReservation(reservationId);
  }
}
