import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { TICKET_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':ticketId')
  @UseGuards(JwtAuthGuard, PolicyGuard)
  @CheckPolicies(TICKET_READ_POLICY)
  getTicket(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.ticketsService.getTicket(ticketId);
  }
}
