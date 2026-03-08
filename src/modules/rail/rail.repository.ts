import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import type {
  RailRequestedSegment,
  RailTripAvailabilityItem,
  RailTripAvailabilitySummary,
  RailTripSearchItem,
  RailTripSearchResult,
  RailTripSeatAvailabilityResult,
  RailTripSummary,
} from './types/rail-search.types';
import type {
  RailCountRow,
  RailResolvedTripStopSegment,
  RailResolvedSegment,
  RailSegmentAllocationRow,
  RailTripSegmentRow,
} from './types/rail-repository.types';

@Injectable()
export class RailRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findTripById(tripId: string): Promise<RailTripSummary | null> {
    return this.prisma.railTrip
      .findUnique({
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
      })
      .then((trip) => {
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
    const statusClause = query.status
      ? Prisma.sql`AND t."status" = ${query.status}`
      : Prisma.empty;

    const [countRows, segmentRows] = await Promise.all([
      this.prisma.$queryRaw<RailCountRow[]>(Prisma.sql`
        SELECT COUNT(DISTINCT t."id")::bigint AS "total"
        FROM "RailTrip" t
        INNER JOIN "RailTripStop" boarding_stop ON boarding_stop."tripId" = t."id"
        INNER JOIN "RailStation" boarding_station ON boarding_station."id" = boarding_stop."stationId"
        INNER JOIN "RailTripStop" drop_stop ON drop_stop."tripId" = t."id"
        INNER JOIN "RailStation" drop_station ON drop_station."id" = drop_stop."stationId"
        WHERE boarding_station."code" = ${query.originCode}
          AND drop_station."code" = ${query.destinationCode}
          AND boarding_stop."sequence" < drop_stop."sequence"
          AND t."departsAt" >= ${travelDateWindow.start}
          AND t."departsAt" < ${travelDateWindow.end}
          ${statusClause}
      `),
      this.prisma.$queryRaw<RailTripSegmentRow[]>(Prisma.sql`
        WITH matching_segments AS (
          SELECT
            t."id" AS "tripId",
            t."departsAt" AS "departsAt",
            boarding_stop."sequence" AS "boardingSequence",
            drop_stop."sequence" AS "dropSequence",
            ROW_NUMBER() OVER (
              PARTITION BY t."id"
              ORDER BY boarding_stop."sequence" ASC, drop_stop."sequence" ASC
            ) AS "segmentRank"
          FROM "RailTrip" t
          INNER JOIN "RailTripStop" boarding_stop ON boarding_stop."tripId" = t."id"
          INNER JOIN "RailStation" boarding_station ON boarding_station."id" = boarding_stop."stationId"
          INNER JOIN "RailTripStop" drop_stop ON drop_stop."tripId" = t."id"
          INNER JOIN "RailStation" drop_station ON drop_station."id" = drop_stop."stationId"
          WHERE boarding_station."code" = ${query.originCode}
            AND drop_station."code" = ${query.destinationCode}
            AND boarding_stop."sequence" < drop_stop."sequence"
            AND t."departsAt" >= ${travelDateWindow.start}
            AND t."departsAt" < ${travelDateWindow.end}
            ${statusClause}
        )
        SELECT
          "tripId",
          "boardingSequence",
          "dropSequence"
        FROM matching_segments
        WHERE "segmentRank" = 1
        ORDER BY "departsAt" ASC, "tripId" ASC
        OFFSET ${skip}
        LIMIT ${take}
      `),
    ]);

    const tripIds = segmentRows.map((row) => row.tripId);
    const [trips, seatCounts] = await Promise.all([
      tripIds.length === 0
        ? Promise.resolve([])
        : this.prisma.railTrip.findMany({
            where: {
              id: {
                in: tripIds,
              },
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
      tripIds.length === 0
        ? Promise.resolve([])
        : this.prisma.railTripSeat.groupBy({
            by: ['tripId', 'status'],
            where: {
              tripId: {
                in: tripIds,
              },
            },
            _count: {
              _all: true,
            },
          }),
    ]);

    const tripEntries: Array<[string, RailTripSummary]> = trips.map(
      (trip): [string, RailTripSummary] => [
        trip.id,
        {
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
        },
      ],
    );

    const tripsById = new Map<string, RailTripSummary>(tripEntries);
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

    const items: RailTripSearchItem[] = segmentRows
      .map((row) => {
        const trip = tripsById.get(row.tripId);
        if (!trip) {
          return null;
        }

        const requestedSegment: RailRequestedSegment = {
          boardingStationCode: query.originCode,
          dropStationCode: query.destinationCode,
          boardingSequence: Number(row.boardingSequence),
          dropSequence: Number(row.dropSequence),
        };

        return {
          ...trip,
          availability: availabilityByTripId.get(row.tripId) ?? {
            totalSeats: 0,
            availableSeats: 0,
            reservedSeats: 0,
            soldSeats: 0,
            blockedSeats: 0,
          },
          requestedSegment,
        };
      })
      .filter((item): item is RailTripSearchItem => item !== null);

    return {
      items,
      meta: this.buildPaginationMeta(
        page,
        limit,
        this.normalizeCount(countRows[0]?.total ?? 0),
      ),
    };
  }

  async getTripSeatAvailability(
    tripId: string,
    query: GetRailTripAvailabilityQueryDto,
    resolvedSegment?: RailResolvedTripStopSegment | null,
  ): Promise<Omit<RailTripSeatAvailabilityResult, 'trip' | 'requestedSegment'>> {
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

    const activeSegmentAllocations =
      resolvedSegment && seats.length > 0
        ? await this.prisma.railSeatAllocation.findMany({
            where: {
              tripId,
              tripSeatId: {
                in: seats.map((seat) => seat.id),
              },
              releasedAt: null,
              cancelledAt: null,
              expiredAt: null,
              NOT: [
                {
                  dropSequence: {
                    lte: resolvedSegment.boardingSequence,
                  },
                },
                {
                  boardingSequence: {
                    gte: resolvedSegment.dropSequence,
                  },
                },
              ],
              booking: {
                OR: [
                  {
                    status: 'CONFIRMED',
                  },
                  {
                    status: 'HOLD',
                    holdExpiresAt: {
                      gt: new Date(),
                    },
                  },
                  {
                    status: 'HOLD',
                    holdExpiresAt: null,
                  },
                ],
              },
            },
            select: {
              tripSeatId: true,
              booking: {
                select: {
                  status: true,
                  holdExpiresAt: true,
                },
              },
            },
          })
        : [];

    const segmentAllocationBySeatId =
      this.buildSegmentAllocationMap(activeSegmentAllocations);

    const items: RailTripAvailabilityItem[] = seats.map((seat) => ({
      id: seat.id,
      coachCode: seat.coach.code,
      seatClass: seat.coach.seatClass,
      seatNo: seat.seat.seatNumber,
      seatCode: seat.seat.code,
      seatLabel: seat.seat.label,
      status:
        segmentAllocationBySeatId.get(seat.id)?.bookingStatus === 'CONFIRMED'
          ? 'SOLD'
          : segmentAllocationBySeatId.get(seat.id)?.bookingStatus === 'HOLD'
            ? 'RESERVED'
            : seat.status,
      reservedUntil:
        segmentAllocationBySeatId.get(seat.id)?.bookingStatus === 'HOLD'
          ? segmentAllocationBySeatId.get(seat.id)?.holdExpiresAt ?? null
          : seat.reservedUntil,
      priceCents: seat.priceCents ?? seat.trip.basePriceCents,
      feesCents: seat.feesCents ?? seat.trip.feesCents,
    }));

    return {
      items,
      meta: this.buildPaginationMeta(page, limit, total),
    };
  }

  async resolveTripStopSegmentByStationCodes(
    tripId: string,
    boardingStationCode: string,
    dropStationCode: string,
  ): Promise<RailResolvedTripStopSegment | null> {
    const stops = await this.prisma.railTripStop.findMany({
      where: {
        tripId,
        station: {
          code: {
            in: [boardingStationCode, dropStationCode],
          },
        },
      },
      select: {
        id: true,
        sequence: true,
        isBoardingAllowed: true,
        isDropAllowed: true,
        station: {
          select: {
            code: true,
          },
        },
      },
      orderBy: {
        sequence: 'asc',
      },
    });

    const boardingStop = stops.find(
      (stop) => stop.station.code === boardingStationCode,
    );
    const dropStop = stops.find((stop) => stop.station.code === dropStationCode);

    if (!boardingStop || !dropStop || boardingStop.sequence >= dropStop.sequence) {
      return null;
    }

    return {
      boardingTripStopId: boardingStop.id,
      dropTripStopId: dropStop.id,
      boardingStationCode,
      dropStationCode,
      boardingSequence: boardingStop.sequence,
      dropSequence: dropStop.sequence,
      isBoardingAllowed: boardingStop.isBoardingAllowed,
      isDropAllowed: dropStop.isDropAllowed,
    };
  }

  async resolveTripSegmentByStationCodes(
    tripId: string,
    boardingStationCode: string,
    dropStationCode: string,
  ): Promise<RailResolvedSegment | null> {
    const segment = await this.resolveTripStopSegmentByStationCodes(
      tripId,
      boardingStationCode,
      dropStationCode,
    );

    if (!segment) {
      return null;
    }

    return {
      boardingStationCode: segment.boardingStationCode,
      dropStationCode: segment.dropStationCode,
      boardingSequence: segment.boardingSequence,
      dropSequence: segment.dropSequence,
    };
  }

  private getTravelDateWindow(dateIso: string): { start: Date; end: Date } {
    const start = new Date(`${dateIso}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }

  private normalizeCount(value: bigint | number | string): number {
    if (typeof value === 'bigint') {
      return Number(value);
    }

    return Number(value);
  }

  private buildSegmentAllocationMap(
    rows: Array<{
      tripSeatId: string;
      booking: {
        status: string;
        holdExpiresAt: Date | null;
      };
    }>,
  ): Map<string, RailSegmentAllocationRow> {
    const map = new Map<string, RailSegmentAllocationRow>();

    for (const row of rows) {
      const current = map.get(row.tripSeatId);
      const candidate: RailSegmentAllocationRow = {
        tripSeatId: row.tripSeatId,
        bookingStatus: row.booking.status,
        holdExpiresAt: row.booking.holdExpiresAt,
      };

      if (!current || candidate.bookingStatus === 'CONFIRMED') {
        map.set(row.tripSeatId, candidate);
      }
    }

    return map;
  }
}
