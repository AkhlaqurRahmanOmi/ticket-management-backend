import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentTenant } from '@/common/decorators/current-tenant.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { TenantAccess } from '@/common/decorators/tenant-access.decorator';
import { TenantHeaderDoc } from '@/common/decorators/tenant-header-doc.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantAccessGuard } from '@/common/guards/tenant-access.guard';
import { TicketsService } from './tickets.service';

@Controller('me/tickets')
export class MeTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, TenantAccessGuard, RolesGuard)
  @Roles('USER')
  @TenantAccess({
    requireResolvedTenant: true,
    requireActiveDomainSubscription: true,
  })
  @TenantHeaderDoc()
  getMyTickets(
    @CurrentUser('id') userId: string,
    @CurrentTenant('orgId') tenantOrgId: string,
  ) {
    return this.ticketsService.getMyTickets(userId, tenantOrgId);
  }
}
