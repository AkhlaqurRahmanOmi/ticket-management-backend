import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsRepository } from './events.repository';
import { OutboxService } from '@/infra/outbox/outbox/outbox.service';
import { UpdateEventDto } from './dto/update-event.dto';
import { GetEventSeatsQueryDto } from './dto/get-event-seats.query.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly outboxService: OutboxService,
  ) {}

  async createEvent(actorUserId: string, tenantOrgId: string, dto: CreateEventDto) {
    this.validateDateWindow(dto.startsAt, dto.endsAt);

    if (dto.orgId !== tenantOrgId) {
      throw new BadRequestException(
        'orgId must match the resolved tenant context.',
      );
    }

    const venue = await this.eventsRepository.findVenueById(dto.venueId);
    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }
    if (venue.orgId !== tenantOrgId) {
      throw new ForbiddenException(
        'Venue does not belong to the resolved tenant.',
      );
    }

    const event = await this.eventsRepository.createEventWithSeatInventory(dto);

    await this.outboxService.enqueue(
      'event.created',
      event.id,
      {
        eventId: event.id,
        orgId: event.orgId,
        venueId: event.venueId,
      },
      actorUserId,
    );

    return event;
  }

  async updateEvent(
    actorUserId: string,
    tenantOrgId: string,
    eventId: string,
    dto: UpdateEventDto,
  ) {
    const event = await this.eventsRepository.findEventById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    if (event.orgId !== tenantOrgId) {
      throw new ForbiddenException(
        'Event does not belong to the resolved tenant.',
      );
    }

    const startsAt = dto.startsAt ?? event.startsAt.toISOString();
    const endsAt = dto.endsAt ?? event.endsAt?.toISOString();
    this.validateDateWindow(startsAt, endsAt);

    if (dto.status) {
      this.validateStatusTransition(event.status, dto.status);
    }

    const updated = await this.eventsRepository.updateEvent(eventId, dto);

    await this.outboxService.enqueue(
      'event.updated',
      updated.id,
      {
        eventId: updated.id,
        orgId: updated.orgId,
        venueId: updated.venueId,
        status: updated.status,
      },
      actorUserId,
    );

    return updated;
  }

  async getEventSeats(
    tenantOrgId: string,
    eventId: string,
    query: GetEventSeatsQueryDto,
  ) {
    const event = await this.eventsRepository.findEventById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found.');
    }
    if (event.orgId !== tenantOrgId) {
      throw new ForbiddenException(
        'Event does not belong to the resolved tenant.',
      );
    }

    return this.eventsRepository.getEventSeatMapByQuery(eventId, query);
  }

  async syncEventSeats(
    actorUserId: string,
    tenantOrgId: string,
    eventId: string,
  ) {
    const event = await this.eventsRepository.findEventById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found.');
    }
    if (event.orgId !== tenantOrgId) {
      throw new ForbiddenException(
        'Event does not belong to the resolved tenant.',
      );
    }

    const result = await this.eventsRepository.syncEventSeatInventory(eventId);
    if (!result) {
      throw new NotFoundException('Event not found.');
    }

    await this.outboxService.enqueue(
      'event.seats.synced',
      eventId,
      result,
      actorUserId,
    );

    return result;
  }

  private validateDateWindow(startsAtIso: string, endsAtIso?: string): void {
    if (!endsAtIso) return;

    const startsAt = new Date(startsAtIso);
    const endsAt = new Date(endsAtIso);

    if (endsAt.getTime() < startsAt.getTime()) {
      throw new BadRequestException('endsAt must be greater than or equal to startsAt.');
    }
  }

  private validateStatusTransition(currentStatus: string, nextStatus: string): void {
    if (currentStatus === nextStatus) return;

    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['PUBLISHED', 'CANCELLED'],
      PUBLISHED: ['CANCELLED'],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[currentStatus] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Invalid event status transition from ${currentStatus} to ${nextStatus}.`,
      );
    }
  }
}
