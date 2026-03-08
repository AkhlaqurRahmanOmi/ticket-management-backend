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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateRailHoldDto } from './dto/create-rail-hold.dto';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import { RailService } from './rail.service';

@ApiTags('Rail Booking')
@ApiBearerAuth('access-token')
@Controller('trips')
export class RailController {
  constructor(private readonly railService: RailService) {}

  @Get('search')
  searchTrips(@Query() query: SearchRailTripsQueryDto) {
    return this.railService.searchTrips(query);
  }

  @Get(':tripId/availability')
  getTripSeatAvailability(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: GetRailTripAvailabilityQueryDto,
  ) {
    return this.railService.getTripSeatAvailability(tripId, query);
  }

  @Post(':tripId/holds')
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles('USER')
  @RateLimit({ limit: 15, windowSeconds: 60, keyPrefix: 'rail:holds:create' })
  createHold(
    @CurrentUser('id') userId: string,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateRailHoldDto,
    @Req() request: Request,
  ) {
    return this.railService.createHold(userId, tripId, dto, request.requestId);
  }

  @Get('holds/:holdId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  getHold(
    @CurrentUser('id') userId: string,
    @Param('holdId', ParseUUIDPipe) holdId: string,
  ) {
    return this.railService.getHold(userId, holdId);
  }
}
