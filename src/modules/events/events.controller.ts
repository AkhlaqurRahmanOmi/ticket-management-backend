import { Controller, Param, Patch, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { EVENT_MANAGE_POLICY } from '@/modules/iam/provider/authorization/policy-tokens';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Patch(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @CheckPolicies(EVENT_MANAGE_POLICY)
  manageEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.eventsService.manageEvent(eventId);
  }
}
