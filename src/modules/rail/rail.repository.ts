import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import type {
  RailTripAvailabilityItem,
  RailTripAvailabilitySummary,
  RailTripSearchItem,
  RailTripSearchResult,
  RailTripSeatAvailabilityResult,
  RailTripSummary,
} from './types/rail-search.types';

@Injectable()
export class RailRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findTripById(tripId: string): Promise<RailTripSummary | null> {
    return this.prisma.railTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        tripNumber: true,
        title: true,
        status: true,
        departsAt: true,
        arrivesAt: true,
        currency: true,
        basePriceCents: true,
        feesCents: true,
        originStation: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            country: true,
          },
        },
        destinationStation: {
          select: {
            id: true,
            code: true,
            name: true,
            city: true,
            country: true,
          },
        },
      },
    }).then((trip) => {
      if (!trip) {
        return null;
      }

      return {
        id: trip.id,
        tripNumber: trip.tripNumber,
        title: trip.title,
        status: trip.status,
        departsAt: trip.departsAt,
        arrivesAt: trip.arrivesAt,
        currency: trip.currency,
        basePriceCents: trip.basePriceCents,
        feesCents: trip.feesCents,
        origin: trip.originStation,
        destination: trip.destinationStation,
      };
    });
  }

  async searchTrips(
    query: SearchRailTripsQueryDto,
  ): Promise<RailTripSearchResult> {
    const { skip, take, page, limit } = this.getPagination(query);
    const travelDateWindow = this.getTravelDateWindow(query.departureDate);

    const whereClause: Record<string, unknown> = {
      departsAt: {
        gte: travelDateWindow.start,
        lt: travelDateWindow.end,
      },
      originStation: {
        is: {
          code: query.originCode,
        },
      },
      destinationStation: {
        is: {
          code: query.destinationCode,
        },
      },
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    const [total, trips] = await Promise.all([
      this.prisma.railTrip.count({ where: whereClause as never }),
      this.prisma.railTrip.findMany({
        where: whereClause as never,
        skip,
        take,
        orderBy: {
          departsAt: 'asc',
        },
        select: {
          id: true,
          tripNumber: true,
          title: true,
          status: true,
          departsAt: true,
          arrivesAt: true,
          currency: true,
          basePriceCents: true,
          feesCents: true,
          originStation: {
            select: {
              id: true,
              code: true,
              name: true,
              city: true,
              country: true,
            },
          },
          destinationStation: {
            select: {
              id: true,
              code: true,
              name: true,
              city: true,
              country: true,
            },
          },
        },
      }),
    ]);

    const tripIds = trips.map((trip) => trip.id);
    const seatCounts =
      tripIds.length === 0
        ? []
        : await this.prisma.railTripSeat.groupBy({
            by: ['tripId', 'status'],
            where: {
              tripId: {
                in: tripIds,
              },
            },
            _count: {
              _all: true,
            },
          });

    const availabilityByTripId = new Map<string, RailTripAvailabilitySummary>();

    for (const seatCount of seatCounts) {
      const current = availabilityByTripId.get(seatCount.tripId) ?? {
        totalSeats: 0,
        availableSeats: 0,
        reservedSeats: 0,
        soldSeats: 0,
        blockedSeats: 0,
      };

      current.totalSeats += seatCount._count._all;

      if (seatCount.status === 'AVAILABLE') current.availableSeats += seatCount._count._all;
      if (seatCount.status === 'RESERVED') current.reservedSeats += seatCount._count._all;
      if (seatCount.status === 'SOLD') current.soldSeats += seatCount._count._all;
      if (seatCount.status === 'BLOCKED') current.blockedSeats += seatCount._count._all;

      availabilityByTripId.set(seatCount.tripId, current);
    }

    const items: RailTripSearchItem[] = trips.map((trip) => ({
      id: trip.id,
      tripNumber: trip.tripNumber,
      title: trip.title,
      status: trip.status,
      departsAt: trip.departsAt,
      arrivesAt: trip.arrivesAt,
      currency: trip.currency,
      basePriceCents: trip.basePriceCents,
      feesCents: trip.feesCents,
      origin: trip.originStation,
      destination: trip.destinationStation,
      availability: availabilityByTripId.get(trip.id) ?? {
        totalSeats: 0,
        availableSeats: 0,
        reservedSeats: 0,
        soldSeats: 0,
        blockedSeats: 0,
      },
    }));

    return {
      items,
      meta: this.buildPaginationMeta(page, limit, total),
    };
  }

  async getTripSeatAvailability(
    tripId: string,
    query: GetRailTripAvailabilityQueryDto,
  ): Promise<Omit<RailTripSeatAvailabilityResult, 'trip'>> {
    const { skip, take, page, limit } = this.getPagination(query);
    const whereClause: Record<string, unknown> = {
      tripId,
    };

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.coachCode) {
      whereClause.coach = {
        is: {
          code: query.coachCode,
        },
      };
    }

    const [total, seats] = await Promise.all([
      this.prisma.railTripSeat.count({
        where: whereClause as never,
      }),
      this.prisma.railTripSeat.findMany({
        where: whereClause as never,
        skip,
        take,
        orderBy: [
          {
            coach: {
              sortOrder: 'asc',
            },
          },
          {
            seat: {
              seatNumber: 'asc',
            },
          },
        ],
        select: {
          id: true,
          status: true,
          reservedUntil: true,
          priceCents: true,
          feesCents: true,
          coach: {
            select: {
              code: true,
              seatClass: true,
            },
          },
          seat: {
            select: {
              seatNumber: true,
              code: true,
              label: true,
            },
          },
          trip: {
            select: {
              basePriceCents: true,
              feesCents: true,
            },
          },
        },
      }),
    ]);

    const items: RailTripAvailabilityItem[] = seats.map((seat) => ({
      id: seat.id,
      coachCode: seat.coach.code,
      seatClass: seat.coach.seatClass,
      seatNo: seat.seat.seatNumber,
      seatCode: seat.seat.code,
      seatLabel: seat.seat.label,
      status: seat.status,
      reservedUntil: seat.reservedUntil,
      priceCents: seat.priceCents ?? seat.trip.basePriceCents,
      feesCents: seat.feesCents ?? seat.trip.feesCents,
    }));

    return {
      items,
      meta: this.buildPaginationMeta(page, limit, total),
    };
  }

  private getTravelDateWindow(dateIso: string): { start: Date; end: Date } {
    const start = new Date(`${dateIso}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }
}
