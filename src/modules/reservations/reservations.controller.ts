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
import type { Request } from 'express';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { RESERVATION_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles('USER')
  @RateLimit({ limit: 15, windowSeconds: 60, keyPrefix: 'reservations:create' })
  createReservation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReservationDto,
    @Req() request: Request,
  ) {
    return this.reservationsService.createReservation(
      userId,
      dto,
      request.requestId,
    );
  }

  @Get(':reservationId')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @CheckPolicies(RESERVATION_READ_POLICY)
  getReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string) {
    return this.reservationsService.getReservation(reservationId);
  }
}
