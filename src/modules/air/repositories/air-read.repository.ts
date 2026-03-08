import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import { GetFlightAvailabilityQueryDto } from '../dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from '../dto/search-flights.query.dto';
import type {
  FlightCabinAvailabilityItem,
  FlightLegSummary,
  FlightRequestedLegRange,
  FlightSearchItem,
  FlightSearchResult,
  FlightInstanceSummary,
} from '../types/air-search.types';
import type {
  AirCountRow,
  FlightAvailabilityRow,
  FlightCabinAllocationSummaryRow,
  FlightHoldLegRangeRow,
  FlightLegRow,
  FlightResolvedLegRangeRow,
  FlightSearchRow,
  FlightSummaryRow,
} from '../types/air-repository.types';

@Injectable()
export class AirReadRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async searchFlights(
    orgId: string,
    query: SearchFlightsQueryDto,
  ): Promise<FlightSearchResult> {
    const { skip, take, page, limit } = this.getPagination(query);
    const travelDateWindow = this.getTravelDateWindow(query.departureDate);
    const statusClause = query.status
      ? Prisma.sql`AND fi."status" = ${query.status}`
      : Prisma.empty;
    const cabinClause = query.cabinCode
      ? Prisma.sql`AND ci."cabinCode" = ${query.cabinCode}`
      : Prisma.empty;
    const fareClause = query.fareClassCode
      ? Prisma.sql`AND ci."fareClassCode" = ${query.fareClassCode}`
      : Prisma.empty;
    const inventoryExistsClause =
      query.cabinCode || query.fareClassCode
        ? Prisma.sql`
            AND EXISTS (
              SELECT 1
              FROM "FlightCabinInventory" ci
              WHERE ci."flightInstanceId" = fi."id"
                ${cabinClause}
                ${fareClause}
            )
          `
        : Prisma.empty;

    const [countRows, rows] = await Promise.all([
      this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
        WITH matching_ranges AS (
          SELECT
            fi."id" AS "flightInstanceId",
            fi."departsAt" AS "flightDepartsAt",
            origin_leg."sequence" AS "requestedOriginSequence",
            destination_leg."sequence" AS "requestedDestinationSequence",
            0 AS "matchOrder"
          FROM "FlightInstance" fi
          INNER JOIN "FlightLegInstance" origin_leg ON origin_leg."flightInstanceId" = fi."id"
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = origin_leg."originAirportId"
          INNER JOIN "FlightLegInstance" destination_leg ON destination_leg."flightInstanceId" = fi."id"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = destination_leg."destinationAirportId"
          WHERE origin_airport."code" = ${query.originCode}
            AND fi."orgId" = ${orgId}::uuid
            AND destination_airport."code" = ${query.destinationCode}
            AND origin_leg."sequence" <= destination_leg."sequence"
            AND fi."departsAt" >= ${travelDateWindow.start}
            AND fi."departsAt" < ${travelDateWindow.end}
            ${statusClause}
            ${inventoryExistsClause}

          UNION ALL

          SELECT
            fi."id" AS "flightInstanceId",
            fi."departsAt" AS "flightDepartsAt",
            1 AS "requestedOriginSequence",
            1 AS "requestedDestinationSequence",
            1 AS "matchOrder"
          FROM "FlightInstance" fi
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
          WHERE origin_airport."code" = ${query.originCode}
            AND fi."orgId" = ${orgId}::uuid
            AND destination_airport."code" = ${query.destinationCode}
            AND NOT EXISTS (
              SELECT 1
              FROM "FlightLegInstance" fallback_leg
              WHERE fallback_leg."flightInstanceId" = fi."id"
            )
            AND fi."departsAt" >= ${travelDateWindow.start}
            AND fi."departsAt" < ${travelDateWindow.end}
            ${statusClause}
            ${inventoryExistsClause}
        ),
        ranked_matches AS (
          SELECT
            "flightInstanceId",
            ROW_NUMBER() OVER (
              PARTITION BY "flightInstanceId"
              ORDER BY "matchOrder" ASC, "requestedOriginSequence" ASC, "requestedDestinationSequence" ASC
            ) AS "rangeRank"
          FROM matching_ranges
        )
        SELECT COUNT(DISTINCT "flightInstanceId")::bigint AS "total"
        FROM ranked_matches
        WHERE "rangeRank" = 1
      `),
      this.prisma.$queryRaw<FlightSearchRow[]>(Prisma.sql`
        WITH matching_ranges AS (
          SELECT
            fi."id" AS "flightInstanceId",
            fi."departsAt" AS "flightDepartsAt",
            origin_leg."sequence" AS "requestedOriginSequence",
            destination_leg."sequence" AS "requestedDestinationSequence",
            0 AS "matchOrder"
          FROM "FlightInstance" fi
          INNER JOIN "FlightLegInstance" origin_leg ON origin_leg."flightInstanceId" = fi."id"
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = origin_leg."originAirportId"
          INNER JOIN "FlightLegInstance" destination_leg ON destination_leg."flightInstanceId" = fi."id"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = destination_leg."destinationAirportId"
          WHERE origin_airport."code" = ${query.originCode}
            AND destination_airport."code" = ${query.destinationCode}
            AND origin_leg."sequence" <= destination_leg."sequence"
            AND fi."departsAt" >= ${travelDateWindow.start}
            AND fi."departsAt" < ${travelDateWindow.end}
            ${statusClause}
            ${inventoryExistsClause}

          UNION ALL

          SELECT
            fi."id" AS "flightInstanceId",
            fi."departsAt" AS "flightDepartsAt",
            1 AS "requestedOriginSequence",
            1 AS "requestedDestinationSequence",
            1 AS "matchOrder"
          FROM "FlightInstance" fi
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
          WHERE origin_airport."code" = ${query.originCode}
            AND destination_airport."code" = ${query.destinationCode}
            AND NOT EXISTS (
              SELECT 1
              FROM "FlightLegInstance" fallback_leg
              WHERE fallback_leg."flightInstanceId" = fi."id"
            )
            AND fi."departsAt" >= ${travelDateWindow.start}
            AND fi."departsAt" < ${travelDateWindow.end}
            ${statusClause}
            ${inventoryExistsClause}
        ),
        paged_matches AS (
          SELECT
            "flightInstanceId",
            "requestedOriginSequence",
            "requestedDestinationSequence",
            "flightDepartsAt"
          FROM (
            SELECT
              "flightInstanceId",
              "requestedOriginSequence",
              "requestedDestinationSequence",
              "flightDepartsAt",
              ROW_NUMBER() OVER (
                PARTITION BY "flightInstanceId"
                ORDER BY "matchOrder" ASC, "requestedOriginSequence" ASC, "requestedDestinationSequence" ASC
              ) AS "rangeRank"
            FROM matching_ranges
          ) ranked_matches
          WHERE "rangeRank" = 1
          ORDER BY "flightDepartsAt" ASC, "flightInstanceId" ASC
          OFFSET ${skip}
          LIMIT ${take}
        )
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
          pm."requestedOriginSequence",
          pm."requestedDestinationSequence",
          COALESCE(SUM(ci."quantityTotal"), 0)::bigint AS "totalSeats",
          COALESCE(SUM(ci."quantityAvailable"), 0)::bigint AS "availableSeats",
          COALESCE(SUM(ci."quantityReserved"), 0)::bigint AS "reservedSeats",
          COALESCE(SUM(ci."quantitySold"), 0)::bigint AS "soldSeats"
        FROM paged_matches pm
        INNER JOIN "FlightInstance" fi ON fi."id" = pm."flightInstanceId"
        INNER JOIN "FlightService" fs ON fs."id" = fi."flightServiceId"
        INNER JOIN "Carrier" carrier ON carrier."id" = fs."carrierId"
        INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
        INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
        LEFT JOIN "FlightCabinInventory" ci
          ON ci."flightInstanceId" = fi."id"
          ${cabinClause}
          ${fareClause}
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
          destination_airport."country",
          pm."requestedOriginSequence",
          pm."requestedDestinationSequence"
        ORDER BY fi."departsAt" ASC, fi."id" ASC
      `),
    ]);

    const items: FlightSearchItem[] = rows.map((row) => ({
      ...this.mapFlightSummary(row),
      requestedLegRange: {
        originAirportCode: query.originCode,
        destinationAirportCode: query.destinationCode,
        originSequence: row.requestedOriginSequence,
        destinationSequence: row.requestedDestinationSequence,
      },
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
      inventoryModel: {
        inventoryLevel: 'CABIN_FARE',
        seatAssignmentMode: 'OPTIONAL',
        legAware: true,
      },
    };
  }

  async findFlightById(
    orgId: string,
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
        AND fi."orgId" = ${orgId}::uuid
      LIMIT 1
    `);

    return rows[0] ? this.mapFlightSummary(rows[0]) : null;
  }

  async findFlightLegs(
    orgId: string,
    flightInstanceId: string,
  ): Promise<FlightLegSummary[]> {
    const rows = await this.prisma.$queryRaw<FlightLegRow[]>(Prisma.sql`
      SELECT
        leg."id",
        leg."sequence",
        leg."departsAt",
        leg."arrivesAt",
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
      FROM "FlightLegInstance" leg
      INNER JOIN "FlightInstance" fi ON fi."id" = leg."flightInstanceId"
      INNER JOIN "Airport" origin_airport ON origin_airport."id" = leg."originAirportId"
      INNER JOIN "Airport" destination_airport ON destination_airport."id" = leg."destinationAirportId"
      WHERE leg."flightInstanceId" = ${flightInstanceId}::uuid
        AND fi."orgId" = ${orgId}::uuid
      ORDER BY leg."sequence" ASC
    `);

    return rows.map((row) => ({
      id: row.id,
      sequence: row.sequence,
      departsAt: row.departsAt,
      arrivesAt: row.arrivesAt,
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
    }));
  }

  async resolveFlightLegRangeByAirportCodes(
    orgId: string,
    flightInstanceId: string,
    originCode: string,
    destinationCode: string,
  ): Promise<FlightRequestedLegRange | null> {
    const rows =
      await this.prisma.$queryRaw<FlightResolvedLegRangeRow[]>(Prisma.sql`
        WITH matching_ranges AS (
          SELECT
            origin_leg."sequence" AS "originSequence",
            destination_leg."sequence" AS "destinationSequence",
            ROW_NUMBER() OVER (
              ORDER BY origin_leg."sequence" ASC, destination_leg."sequence" ASC
            ) AS "rangeRank"
          FROM "FlightLegInstance" origin_leg
          INNER JOIN "FlightInstance" fi ON fi."id" = origin_leg."flightInstanceId"
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = origin_leg."originAirportId"
          INNER JOIN "FlightLegInstance" destination_leg ON destination_leg."flightInstanceId" = origin_leg."flightInstanceId"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = destination_leg."destinationAirportId"
          WHERE origin_leg."flightInstanceId" = ${flightInstanceId}::uuid
            AND fi."orgId" = ${orgId}::uuid
            AND origin_airport."code" = ${originCode}
            AND destination_airport."code" = ${destinationCode}
            AND origin_leg."sequence" <= destination_leg."sequence"
        )
        SELECT "originSequence", "destinationSequence"
        FROM matching_ranges
        WHERE "rangeRank" = 1
        LIMIT 1
      `);

    if (rows[0]) {
      return {
        originAirportCode: originCode,
        destinationAirportCode: destinationCode,
        originSequence: rows[0].originSequence,
        destinationSequence: rows[0].destinationSequence,
      };
    }

    const directMatchRows = await this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
      SELECT COUNT(fi."id")::bigint AS "total"
      FROM "FlightInstance" fi
      INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
      INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
      WHERE fi."id" = ${flightInstanceId}::uuid
        AND fi."orgId" = ${orgId}::uuid
        AND origin_airport."code" = ${originCode}
        AND destination_airport."code" = ${destinationCode}
    `);

    if (this.normalizeCount(directMatchRows[0]?.total ?? 0) === 0) {
      return null;
    }

    return {
      originAirportCode: originCode,
      destinationAirportCode: destinationCode,
      originSequence: 1,
      destinationSequence: 1,
    };
  }

  async resolveFlightHoldLegRangeByAirportCodes(
    orgId: string,
    flightInstanceId: string,
    originCode: string,
    destinationCode: string,
  ): Promise<FlightHoldLegRangeRow | null> {
    const rows =
      await this.prisma.$queryRaw<FlightHoldLegRangeRow[]>(Prisma.sql`
        WITH matching_ranges AS (
          SELECT
            origin_leg."id" AS "originLegInstanceId",
            destination_leg."id" AS "destinationLegInstanceId",
            origin_leg."sequence" AS "originSequence",
            destination_leg."sequence" AS "destinationSequence",
            ROW_NUMBER() OVER (
              ORDER BY origin_leg."sequence" ASC, destination_leg."sequence" ASC
            ) AS "rangeRank"
          FROM "FlightLegInstance" origin_leg
          INNER JOIN "FlightInstance" fi ON fi."id" = origin_leg."flightInstanceId"
          INNER JOIN "Airport" origin_airport ON origin_airport."id" = origin_leg."originAirportId"
          INNER JOIN "FlightLegInstance" destination_leg ON destination_leg."flightInstanceId" = origin_leg."flightInstanceId"
          INNER JOIN "Airport" destination_airport ON destination_airport."id" = destination_leg."destinationAirportId"
          WHERE origin_leg."flightInstanceId" = ${flightInstanceId}::uuid
            AND fi."orgId" = ${orgId}::uuid
            AND origin_airport."code" = ${originCode}
            AND destination_airport."code" = ${destinationCode}
            AND origin_leg."sequence" <= destination_leg."sequence"
        )
        SELECT
          "originLegInstanceId",
          "destinationLegInstanceId",
          "originSequence",
          "destinationSequence"
        FROM matching_ranges
        WHERE "rangeRank" = 1
        LIMIT 1
      `);

    if (rows[0]) {
      return rows[0];
    }

    const directMatchRows = await this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
      SELECT COUNT(fi."id")::bigint AS "total"
      FROM "FlightInstance" fi
      INNER JOIN "Airport" origin_airport ON origin_airport."id" = fi."originAirportId"
      INNER JOIN "Airport" destination_airport ON destination_airport."id" = fi."destinationAirportId"
      WHERE fi."id" = ${flightInstanceId}::uuid
        AND fi."orgId" = ${orgId}::uuid
        AND origin_airport."code" = ${originCode}
        AND destination_airport."code" = ${destinationCode}
    `);

    if (this.normalizeCount(directMatchRows[0]?.total ?? 0) === 0) {
      return null;
    }

    return {
      originLegInstanceId: null,
      destinationLegInstanceId: null,
      originSequence: 1,
      destinationSequence: 1,
    };
  }

  async getFlightAvailability(
    orgId: string,
    flightInstanceId: string,
    query: GetFlightAvailabilityQueryDto,
    requestedLegRange?: Pick<
      FlightRequestedLegRange,
      'originSequence' | 'destinationSequence'
    > | null,
  ): Promise<{
    items: FlightCabinAvailabilityItem[];
    meta: { page: number; limit: number; total: number; hasNext: boolean };
  }> {
    const { skip, take, page, limit } = this.getPagination(query);
    const cabinClause = query.cabinCode
      ? Prisma.sql`AND ci."cabinCode" = ${query.cabinCode}`
      : Prisma.empty;
    const fareClause = query.fareClassCode
      ? Prisma.sql`AND ci."fareClassCode" = ${query.fareClassCode}`
      : Prisma.empty;
    const activeAllocationClause =
      requestedLegRange
        ? Prisma.sql`
            AND NOT (
              aca."destinationSequence" < ${requestedLegRange.originSequence}
              OR aca."originSequence" > ${requestedLegRange.destinationSequence}
            )
          `
        : Prisma.empty;

    const [countRows, rows, activeAllocationRows] = await Promise.all([
      this.prisma.$queryRaw<AirCountRow[]>(Prisma.sql`
        SELECT COUNT(ci."id")::bigint AS "total"
        FROM "FlightCabinInventory" ci
        INNER JOIN "FlightInstance" fi ON fi."id" = ci."flightInstanceId"
        WHERE ci."flightInstanceId" = ${flightInstanceId}::uuid
          AND fi."orgId" = ${orgId}::uuid
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
          AND fi."orgId" = ${orgId}::uuid
          ${cabinClause}
          ${fareClause}
        ORDER BY ci."cabinCode" ASC, ci."fareClassCode" ASC, ci."id" ASC
        OFFSET ${skip}
        LIMIT ${take}
      `),
      requestedLegRange
        ? this.prisma.$queryRaw<FlightCabinAllocationSummaryRow[]>(Prisma.sql`
            SELECT
              aca."flightCabinInventoryId",
              COALESCE(SUM(aca."quantity"), 0)::int AS "reservedQuantity"
            FROM "AirCabinAllocation" aca
            INNER JOIN "Booking" b ON b."id" = aca."bookingId"
            INNER JOIN "FlightInstance" fi ON fi."id" = aca."flightInstanceId"
            WHERE aca."flightInstanceId" = ${flightInstanceId}::uuid
              AND fi."orgId" = ${orgId}::uuid
              AND aca."releasedAt" IS NULL
              AND aca."cancelledAt" IS NULL
              AND aca."expiredAt" IS NULL
              ${activeAllocationClause}
              AND (
                b."status" = 'CONFIRMED'
                OR (
                  b."status" = 'HOLD'
                  AND (b."holdExpiresAt" > NOW() OR b."holdExpiresAt" IS NULL)
                )
              )
            GROUP BY aca."flightCabinInventoryId"
          `)
        : Promise.resolve<FlightCabinAllocationSummaryRow[]>([]),
    ]);

    const activeAllocationMap = new Map<string, number>();
    for (const row of activeAllocationRows) {
      activeAllocationMap.set(
        row.flightCabinInventoryId,
        Number(row.reservedQuantity),
      );
    }

    const items: FlightCabinAvailabilityItem[] = rows.map((row) => {
      const reservedSeats = activeAllocationMap.get(row.id) ?? 0;

      return {
        id: row.id,
        cabinCode: row.cabinCode,
        fareClassCode: row.fareClassCode,
        totalSeats: row.quantityTotal,
        availableSeats: Math.max(
          0,
          row.quantityTotal - row.quantitySold - reservedSeats,
        ),
        reservedSeats,
        soldSeats: row.quantitySold,
        priceCents: row.priceCents ?? row.basePriceCents,
        feesCents: row.feesCents ?? row.baseFeesCents,
      };
    });

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

  private mapFlightSummary(
    row: FlightSummaryRow | FlightSearchRow,
  ): FlightInstanceSummary {
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
