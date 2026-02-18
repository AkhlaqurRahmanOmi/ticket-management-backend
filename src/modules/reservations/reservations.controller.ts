import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { RESERVATION_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  createReservation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.reservationsService.createReservation(userId, dto);
  }

  @Get(':reservationId')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @CheckPolicies(RESERVATION_READ_POLICY)
  getReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string) {
    return this.reservationsService.getReservation(reservationId);
  }
}
