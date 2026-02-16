import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckPolicies } from '@/common/decorators/check-policies.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PolicyGuard } from '@/common/guards/policy.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  EVENT_CREATE_POLICY,
  EVENT_MANAGE_POLICY,
} from '@/modules/iam/provider/authorization/policy-tokens';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsService } from './events.service';
import { GetEventSeatsQueryDto } from './dto/get-event-seats.query.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @CheckPolicies(EVENT_CREATE_POLICY)
  createEvent(
    @CurrentUser('id') actorUserId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.createEvent(actorUserId, dto);
  }

  @Patch(':eventId')
  @UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @CheckPolicies(EVENT_MANAGE_POLICY)
  updateEvent(
    @CurrentUser('id') actorUserId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(actorUserId, eventId, dto);
  }

  @Post(':eventId/seats/sync')
  @UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
  @Roles('ORG_STAFF', 'ORG_ADMIN', 'SUPER_ADMIN')
  @CheckPolicies(EVENT_MANAGE_POLICY)
  syncEventSeats(
    @CurrentUser('id') actorUserId: string,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.eventsService.syncEventSeats(actorUserId, eventId);
  }

  @Get(':eventId/seats')
  getEventSeats(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: GetEventSeatsQueryDto,
  ) {
    return this.eventsService.getEventSeats(eventId, query);
  }
}
