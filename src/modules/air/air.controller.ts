import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AIR_HOLD_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateAirHoldDto } from './dto/create-air-hold.dto';
import { GetFlightAvailabilityQueryDto } from './dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import { AirService } from './air.service';

@ApiTags('Air Booking')
@ApiBearerAuth('access-token')
@Controller('flights')
export class AirController {
  constructor(private readonly airService: AirService) {}

  @Get('search')
  @UseGuards(TenantAccessGuard)
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  searchFlights(
    @CurrentTenant('orgId') tenantOrgId: string,
    @Query() query: SearchFlightsQueryDto,
  ) {
    return this.airService.searchFlights(tenantOrgId, query);
  }

  @Get(':flightInstanceId/availability')
  @UseGuards(TenantAccessGuard)
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  getFlightAvailability(
    @CurrentTenant('orgId') tenantOrgId: string,
    @Param('flightInstanceId', ParseUUIDPipe) flightInstanceId: string,
    @Query() query: GetFlightAvailabilityQueryDto,
  ) {
    return this.airService.getFlightAvailability(
      tenantOrgId,
      flightInstanceId,
      query,
    );
  }

  @Post(':flightInstanceId/holds')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, RateLimitGuard)
  @Roles('USER')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @RateLimit({ limit: 15, windowSeconds: 60, keyPrefix: 'air:holds:create' })
  createHold(
    @CurrentUser('id') userId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
    @Param('flightInstanceId', ParseUUIDPipe) flightInstanceId: string,
    @Body() dto: CreateAirHoldDto,
    @Req() request: Request,
  ) {
    return this.airService.createHold(
      userId,
      tenantOrgId,
      flightInstanceId,
      dto,
      request.requestId,
    );
  }

  @Get('holds/:holdId')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('USER', 'ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @CheckPolicies(AIR_HOLD_READ_POLICY)
  getHold(
    @Param('holdId', ParseUUIDPipe) holdId: string,
  ) {
    return this.airService.getHold(holdId);
  }
}
