import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantAccess } from '@/common/decorators/tenant-access.decorator';
import { TenantHeaderDoc } from '@/common/decorators/tenant-header-doc.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { TICKET_READ_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { TicketsService } from './tickets.service';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get(':ticketId')
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard, PolicyGuard)
  @Roles('USER', 'ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  @CheckPolicies(TICKET_READ_POLICY)
  getTicket(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.ticketsService.getTicket(ticketId);
  }
}
