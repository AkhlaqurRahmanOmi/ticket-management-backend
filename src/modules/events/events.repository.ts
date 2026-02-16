import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { CreateEventDto } from './dto/create-event.dto';
import { GetEventSeatsQueryDto } from './dto/get-event-seats.query.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findEventById(eventId: string) {
    return this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        orgId: true,
        status: true,
        startsAt: true,
        endsAt: true,
      },
    });
  }

  findVenueById(venueId: string) {
    return this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { id: true, orgId: true },
    });
  }

  async createEventWithSeatInventory(dto: CreateEventDto) {
    return this.withTransaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          orgId: dto.orgId,
          venueId: dto.venueId,
          title: dto.title,
          description: dto.description ?? null,
          startsAt: new Date(dto.startsAt),
          endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
          currency: dto.currency ?? 'USD',
        },
      });

      const venueSeats = await tx.venueSeat.findMany({
        where: { venueId: dto.venueId },
        select: { id: true },
      });

      if (venueSeats.length > 0) {
        await tx.eventSeat.createMany({
          data: venueSeats.map((seat) => ({
            eventId: event.id,
            venueSeatId: seat.id,
          })),
        });
      }

      return event;
    });
  }

  async updateEvent(eventId: string, dto: UpdateEventDto) {
    const data: Record<string, unknown> = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startsAt !== undefined) data.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) data.endsAt = new Date(dto.endsAt);
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.status !== undefined) data.status = dto.status;

    try {
      return await this.prisma.event.update({
        where: { id: eventId },
        data: data as never,
      });
    } catch (error) {
      this.mapPersistenceError(error);
    }
  }

  async getEventSeatMap(eventId: string) {
    return this.getEventSeatMapByQuery(eventId, {});
  }

  async getEventSeatMapByQuery(eventId: string, query: GetEventSeatsQueryDto) {
    const { skip, take, page, limit } = this.getPagination(query);
    const whereClause: Record<string, unknown> = { eventId };
    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, seats] = await Promise.all([
      this.prisma.eventSeat.count({
        where: whereClause as never,
      }),
      this.prisma.eventSeat.findMany({
        where: whereClause as never,
        skip,
        take,
        select: {
          id: true,
          status: true,
          reservedUntil: true,
          priceCents: true,
          ticketType: {
            select: {
              priceCents: true,
            },
          },
          venueSeat: {
            select: {
              seatNumber: true,
              code: true,
            },
          },
        },
        orderBy: {
          venueSeat: {
            seatNumber: 'asc',
          },
        },
      }),
    ]);

    const items = seats.map((seat) => ({
      id: seat.id,
      seatNo: seat.venueSeat.seatNumber,
      seatCode: seat.venueSeat.code,
      status: seat.status,
      priceCents: seat.priceCents ?? seat.ticketType?.priceCents ?? 0,
      reservedUntil: seat.reservedUntil,
    }));

    return {
      items,
      meta: this.buildPaginationMeta(page, limit, total),
    };
  }

  async syncEventSeatInventory(eventId: string) {
    return this.withTransaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
        select: { id: true, venueId: true },
      });
      if (!event) return null;

      const venueSeats = await tx.venueSeat.findMany({
        where: { venueId: event.venueId },
        select: { id: true },
      });

      if (venueSeats.length > 0) {
        await tx.eventSeat.createMany({
          data: venueSeats.map((seat) => ({
            eventId: event.id,
            venueSeatId: seat.id,
          })),
          skipDuplicates: true,
        });
      }

      return {
        eventId: event.id,
        syncedSeatCount: venueSeats.length,
      };
    });
  }
}
