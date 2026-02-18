import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TicketsService } from './tickets.service';

@Controller('me/tickets')
export class MeTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  getMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.getMyTickets(userId);
  }
}
