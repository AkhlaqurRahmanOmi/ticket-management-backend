import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { GetFlightAvailabilityQueryDto } from './dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import type {
  FlightCabinAvailabilityItem,
  FlightCabinAvailabilityResult,
  FlightSearchItem,
  FlightSearchResult,
  FlightInstanceSummary,
} from './types/air-search.types';
import type {
  AirCountRow,
  FlightAvailabilityRow,
  FlightSearchRow,
  FlightSummaryRow,
} from './types/air-repository.types';

@Injectable()
export class AirRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async searchFlights(
    query: SearchFlightsQueryDto,
  ): Promise<FlightSearchResult> {
    const { skip, take, page, limit } = this.getPagination(query);
    const travelDateWindow = this.getTravelDateWindow(query.departureDate);
    const statusClause = query.status
      ? Prisma.sql`AND fi."status" = ${query.status}`
      : Prisma.empty;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
        SELECT COUNT(fi."id")::bigint AS "total"
        FROM "FlightInstance" fi
        INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
        INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
        WHERE origin_airport."code" = ${query.originCode}
          AND destination_airport."code" = ${query.destinationCode}
          AND fi."departsAt" >= ${travelDateWindow.start}
          AND fi."departsAt" < ${travelDateWindow.end}
          ${statusClause}
      `),
      this.prisma.$queryRaw<FlightSearchRow[]>(Prisma.sql`
        SELECT
          fi."id",
          fs."flightNumber",
          fs."title",
          fi."status",
          fi."departsAt",
          fi."arrivesAt",
          fi."currency",
          fi."basePriceCents",
          fi."feesCents",
          carrier."id" AS "carrierId",
          carrier."code" AS "carrierCode",
          carrier."name" AS "carrierName",
          origin_airport."id" AS "originId",
          origin_airport."code" AS "originCode",
          origin_airport."name" AS "originName",
          origin_airport."city" AS "originCity",
          origin_airport."country" AS "originCountry",
          destination_airport."id" AS "destinationId",
          destination_airport."code" AS "destinationCode",
          destination_airport."name" AS "destinationName",
          destination_airport."city" AS "destinationCity",
          destination_airport."country" AS "destinationCountry",
          COALESCE(SUM(ci."quantityTotal"), 0)::bigint AS "totalSeats",
          COALESCE(SUM(ci."quantityAvailable"), 0)::bigint AS "availableSeats",
          COALESCE(SUM(ci."quantityReserved"), 0)::bigint AS "reservedSeats",
          COALESCE(SUM(ci."quantitySold"), 0)::bigint AS "soldSeats"
        FROM "FlightInstance" fi
        INNER JOIN "FlightService" fs ON fs."id" = fi."flightServiceId"
        INNER JOIN "Carrier" carrier ON carrier."id" = fs."carrierId"
        INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
        INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
        LEFT JOIN "FlightCabinInventory" ci ON ci."flightInstanceId" = fi."id"
        WHERE origin_airport."code" = ${query.originCode}
          AND destination_airport."code" = ${query.destinationCode}
          AND fi."departsAt" >= ${travelDateWindow.start}
          AND fi."departsAt" < ${travelDateWindow.end}
          ${statusClause}
        GROUP BY
          fi."id",
          fs."flightNumber",
          fs."title",
          fi."status",
          fi."departsAt",
          fi."arrivesAt",
          fi."currency",
          fi."basePriceCents",
          fi."feesCents",
          carrier."id",
          carrier."code",
          carrier."name",
          origin_airport."id",
          origin_airport."code",
          origin_airport."name",
          origin_airport."city",
          origin_airport."country",
          destination_airport."id",
          destination_airport."code",
          destination_airport."name",
          destination_airport."city",
          destination_airport."country"
        ORDER BY fi."departsAt" ASC, fi."id" ASC
        OFFSET ${skip}
        LIMIT ${take}
      `),
    ]);

    const items: FlightSearchItem[] = rows.map((row) => ({
      ...this.mapFlightSummary(row),
      availability: {
        totalSeats: this.normalizeCount(row.totalSeats),
        availableSeats: this.normalizeCount(row.availableSeats),
        reservedSeats: this.normalizeCount(row.reservedSeats),
        soldSeats: this.normalizeCount(row.soldSeats),
      },
    }));

    return {
      items,
      meta: this.buildPaginationMeta(
        page,
        limit,
        this.normalizeCount(countRows[0]?.total ?? 0),
      ),
    };
  }

  async findFlightById(
    flightInstanceId: string,
  ): Promise<FlightInstanceSummary | null> {
    const rows = await this.prisma.$queryRaw<FlightSummaryRow[]>(Prisma.sql`
      SELECT
        fi."id",
        fs."flightNumber",
        fs."title",
        fi."status",
        fi."departsAt",
        fi."arrivesAt",
        fi."currency",
        fi."basePriceCents",
        fi."feesCents",
        carrier."id" AS "carrierId",
        carrier."code" AS "carrierCode",
        carrier."name" AS "carrierName",
        origin_airport."id" AS "originId",
        origin_airport."code" AS "originCode",
        origin_airport."name" AS "originName",
        origin_airport."city" AS "originCity",
        origin_airport."country" AS "originCountry",
        destination_airport."id" AS "destinationId",
        destination_airport."code" AS "destinationCode",
        destination_airport."name" AS "destinationName",
        destination_airport."city" AS "destinationCity",
        destination_airport."country" AS "destinationCountry"
      FROM "FlightInstance" fi
      INNER JOIN "FlightService" fs ON fs."id" = fi."flightServiceId"
      INNER JOIN "Carrier" carrier ON carrier."id" = fs."carrierId"
      INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
      INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
      WHERE fi."id" = ${flightInstanceId}::uuid
      LIMIT 1
    `);

    return rows[0] ? this.mapFlightSummary(rows[0]) : null;
  }

  async getFlightAvailability(
    flightInstanceId: string,
    query: GetFlightAvailabilityQueryDto,
  ): Promise<Omit<FlightCabinAvailabilityResult, 'flight'>> {
    const { skip, take, page, limit } = this.getPagination(query);
    const cabinClause = query.cabinCode
      ? Prisma.sql`AND ci."cabinCode" = ${query.cabinCode}`
      : Prisma.empty;
    const fareClause = query.fareClassCode
      ? Prisma.sql`AND ci."fareClassCode" = ${query.fareClassCode}`
      : Prisma.empty;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
        SELECT COUNT(ci."id")::bigint AS "total"
        FROM "FlightCabinInventory" ci
        WHERE ci."flightInstanceId" = ${flightInstanceId}::uuid
          ${cabinClause}
          ${fareClause}
      `),
      this.prisma.$queryRaw<FlightAvailabilityRow[]>(Prisma.sql`
        SELECT
          ci."id",
          ci."cabinCode",
          ci."fareClassCode",
          ci."quantityTotal",
          ci."quantityAvailable",
          ci."quantityReserved",
          ci."quantitySold",
          ci."priceCents",
          ci."feesCents",
          fi."basePriceCents",
          fi."feesCents" AS "baseFeesCents"
        FROM "FlightCabinInventory" ci
        INNER JOIN "FlightInstance" fi ON fi."id" = ci."flightInstanceId"
        WHERE ci."flightInstanceId" = ${flightInstanceId}::uuid
          ${cabinClause}
          ${fareClause}
        ORDER BY ci."cabinCode" ASC, ci."fareClassCode" ASC, ci."id" ASC
        OFFSET ${skip}
        LIMIT ${take}
      `),
    ]);

    const items: FlightCabinAvailabilityItem[] = rows.map((row) => ({
      id: row.id,
      cabinCode: row.cabinCode,
      fareClassCode: row.fareClassCode,
      totalSeats: row.quantityTotal,
      availableSeats: row.quantityAvailable,
      reservedSeats: row.quantityReserved,
      soldSeats: row.quantitySold,
      priceCents: row.priceCents ?? row.basePriceCents,
      feesCents: row.feesCents ?? row.baseFeesCents,
    }));

    return {
      items,
      meta: this.buildPaginationMeta(
        page,
        limit,
        this.normalizeCount(countRows[0]?.total ?? 0),
      ),
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

  private mapFlightSummary(row: FlightSummaryRow | FlightSearchRow): FlightInstanceSummary {
    return {
      id: row.id,
      flightNumber: row.flightNumber,
      title: row.title,
      status: row.status,
      departsAt: row.departsAt,
      arrivesAt: row.arrivesAt,
      currency: row.currency,
      basePriceCents: row.basePriceCents,
      feesCents: row.feesCents,
      carrier: {
        id: row.carrierId,
        code: row.carrierCode,
        name: row.carrierName,
      },
      origin: {
        id: row.originId,
        code: row.originCode,
        name: row.originName,
        city: row.originCity,
        country: row.originCountry,
      },
      destination: {
        id: row.destinationId,
        code: row.destinationCode,
        name: row.destinationName,
        city: row.destinationCity,
        country: row.destinationCountry,
      },
    };
  }
}
