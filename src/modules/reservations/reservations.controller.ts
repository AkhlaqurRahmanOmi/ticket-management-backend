import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RESERVATION_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get(':reservationId')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @CheckPolicies(RESERVATION_READ_POLICY)
  getReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string) {
    return this.reservationsService.getReservation(reservationId);
  }
}
