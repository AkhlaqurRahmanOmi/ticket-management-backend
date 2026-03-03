import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import {
  type BookingHoldRecord,
  type CreateSeatHoldInput,
  type ExpireBookingHoldResult,
} from './types/booking-hold.types';
import { type BookingPaymentTarget } from './types/booking-payment.types';
import {
  type CreateRailSeatHoldInput,
  type RailBookingHoldRecord,
} from './types/rail-booking-hold.types';
import {
  type BookingPaymentTargetRow,
  type ExpiredHoldCandidate,
  type RailHoldRow,
  type ReservationHoldRow,
} from './types/booking-repository.types';

const reservationHoldSelect = {
  id: true,
  eventId: true,
  userId: true,
  status: true,
  expiresAt: true,
  idempotencyKey: true,
  createdAt: true,
  items: {
    select: {
      eventSeatId: true,
      quantity: true,
      priceCents: true,
      feesCents: true,
    },
  },
} as const;

const bookingPaymentTargetSelect = {
  id: true,
  domainType: true,
  userId: true,
  status: true,
  holdExpiresAt: true,
  currency: true,
  metadata: true,
  items: {
    select: {
      quantity: true,
      unitPriceCents: true,
      feesCents: true,
      inventoryType: true,
      inventoryRefId: true,
      seatLabel: true,
    },
  },
} as const;

const railHoldSelect = {
  id: true,
  userId: true,
  status: true,
  holdExpiresAt: true,
  idempotencyKey: true,
  createdAt: true,
  metadata: true,
  items: {
    select: {
      id: true,
      inventoryRefId: true,
      quantity: true,
      unitPriceCents: true,
      feesCents: true,
      seatLabel: true,
      railSeatAllocations: {
        where: {
          releasedAt: null,
          cancelledAt: null,
        },
        select: {
          tripId: true,
          tripSeatId: true,
          boardingSequence: true,
          dropSequence: true,
          boardingTripStopId: true,
          dropTripStopId: true,
          boardingTripStop: {
            select: {
              station: {
                select: {
                  code: true,
                },
              },
            },
          },
          dropTripStop: {
            select: {
              station: {
                select: {
                  code: true,
                },
              },
            },
          },
          tripSeat: {
            select: {
              coach: {
                select: {
                  code: true,
                },
              },
              seat: {
                select: {
                  seatNumber: true,
                  code: true,
                  label: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

@Injectable()
export class BookingsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  getKernelStatus() {
    return {
      persistenceReady: true,
      domainDelegationReady: true,
    };
  }

  findHoldByUserAndIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<BookingHoldRecord | null> {
    return this.prisma.reservation
      .findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
        select: reservationHoldSelect,
      })
      .then((row) => this.mapReservationHold(row as ReservationHoldRow | null));
  }

  findHoldById(holdId: string): Promise<BookingHoldRecord | null> {
    return this.prisma.reservation
      .findUnique({
        where: { id: holdId },
        select: reservationHoldSelect,
      })
      .then((row) => this.mapReservationHold(row as ReservationHoldRow | null));
  }

  findRailHoldByUserAndIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<RailBookingHoldRecord | null> {
    return this.prisma.booking
      .findUnique({
        where: {
          userId_domainType_idempotencyKey: {
            userId,
            domainType: 'RAIL',
            idempotencyKey,
          },
        },
        select: railHoldSelect,
      })
      .then((row) => this.mapRailHold(row as RailHoldRow | null));
  }

  findRailHoldById(holdId: string): Promise<RailBookingHoldRecord | null> {
    return this.prisma.booking
      .findFirst({
        where: {
          id: holdId,
          domainType: 'RAIL',
        },
        select: railHoldSelect,
      })
      .then((row) => this.mapRailHold(row as RailHoldRow | null));
  }

  async createSeatHold(
    input: CreateSeatHoldInput,
  ): Promise<BookingHoldRecord | null> {
    return this.withTransaction(async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60_000);

      const seat = await tx.eventSeat.findUnique({
        where: { id: input.eventSeatId },
        select: {
          id: true,
          eventId: true,
          status: true,
          reservedUntil: true,
          version: true,
          priceCents: true,
          feesCents: true,
          ticketTypeId: true,
          event: {
            select: {
              orgId: true,
              currency: true,
            },
          },
          ticketType: {
            select: {
              priceCents: true,
            },
          },
          venueSeat: {
            select: {
              label: true,
              seatNumber: true,
              code: true,
            },
          },
        },
      });

      if (!seat || seat.eventId !== input.eventId) {
        throw new NotFoundException('Seat not found for the provided event.');
      }

      if (seat.status === 'SOLD' || seat.status === 'BLOCKED') {
        throw new ConflictException('Seat is not available for reservation.');
      }

      const updatedSeat = await tx.eventSeat.updateMany({
        where: {
          id: input.eventSeatId,
          eventId: input.eventId,
          version: seat.version,
          OR: [
            { status: 'AVAILABLE' },
            {
              status: 'RESERVED',
              reservedUntil: { lt: now },
            },
          ],
        },
        data: {
          status: 'RESERVED',
          reservedUntil: expiresAt,
          version: {
            increment: 1,
          },
        },
      });

      if (updatedSeat.count === 0) {
        const fallbackUpdated = await this.tryPessimisticSeatHold(
          tx as PrismaService,
          input.eventSeatId,
          input.eventId,
          expiresAt,
          now,
        );

        if (!fallbackUpdated) {
          throw new ConflictException(
            'Seat is already reserved by another request.',
          );
        }
      }

      const reservation = await tx.reservation.create({
        data: {
          eventId: input.eventId,
          userId: input.userId,
          status: 'ACTIVE',
          expiresAt,
          idempotencyKey: input.idempotencyKey,
        },
      });

      const itemPrice = seat.priceCents ?? seat.ticketType?.priceCents ?? 0;
      const itemFees = seat.feesCents ?? 0;

      await tx.reservationItem.create({
        data: {
          reservationId: reservation.id,
          eventSeatId: seat.id,
          quantity: 1,
          priceCents: itemPrice,
          feesCents: itemFees,
        },
      });

      await tx.booking.create({
        data: {
          id: reservation.id,
          userId: input.userId,
          orgId: seat.event.orgId,
          domainType: 'EVENT',
          status: 'HOLD',
          currency: seat.event.currency,
          holdExpiresAt: expiresAt,
          idempotencyKey: input.idempotencyKey,
          metadata: {
            eventId: input.eventId,
            legacyReservationId: reservation.id,
          } as never,
        } as never,
      });

      await tx.bookingItem.create({
        data: {
          bookingId: reservation.id,
          status: 'HOLD',
          inventoryType: 'event-seat',
          inventoryRefId: seat.id,
          seatLabel:
            seat.venueSeat.label ?? seat.venueSeat.seatNumber ?? seat.venueSeat.code,
          quantity: 1,
          unitPriceCents: itemPrice,
          feesCents: itemFees,
          currency: seat.event.currency,
          snapshot: {
            eventId: input.eventId,
            eventSeatId: seat.id,
            ticketTypeId: seat.ticketTypeId,
          } as never,
          metadata: {
            legacyReservationId: reservation.id,
          } as never,
        } as never,
      });

      await tx.outboxEvent.create({
        data: {
          topic: 'reservation.created',
          key: reservation.id,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId: input.correlationId,
            actor: input.userId,
            data: {
              reservationId: reservation.id,
              eventId: input.eventId,
              eventSeatId: seat.id,
              expiresAt: expiresAt.toISOString(),
            },
          } as never,
          status: 'PENDING',
          correlationId: input.correlationId,
          actorUserId: input.userId,
        },
      });

      const createdReservation = await tx.reservation.findUnique({
        where: { id: reservation.id },
        select: reservationHoldSelect,
      });

      return this.mapReservationHold(createdReservation as ReservationHoldRow | null);
    });
  }

  async createRailSeatHold(
    input: CreateRailSeatHoldInput,
  ): Promise<RailBookingHoldRecord | null> {
    return this.withTransaction(async (tx) => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60_000);

      const tripSeat = await tx.railTripSeat.findUnique({
        where: { id: input.tripSeatId },
        select: {
          id: true,
          tripId: true,
          status: true,
          priceCents: true,
          feesCents: true,
          trip: {
            select: {
              orgId: true,
              currency: true,
              basePriceCents: true,
              feesCents: true,
              status: true,
            },
          },
          coach: {
            select: {
              code: true,
            },
          },
          seat: {
            select: {
              seatNumber: true,
              code: true,
              label: true,
            },
          },
        },
      });

      if (!tripSeat || tripSeat.tripId !== input.tripId) {
        throw new NotFoundException('Rail seat not found for the provided trip.');
      }

      if (tripSeat.trip.status !== 'PUBLISHED') {
        throw new ConflictException(
          'Rail seat cannot be held because the trip is not published.',
        );
      }

      if (tripSeat.status === 'SOLD' || tripSeat.status === 'BLOCKED') {
        throw new ConflictException('Rail seat is not available for booking.');
      }

      await this.releaseExpiredRailSeatAllocations(
        tx,
        input.tripId,
        input.tripSeatId,
        input.boardingSequence,
        input.dropSequence,
        now,
      );

      const overlappingAllocation = await tx.railSeatAllocation.findFirst({
        where: {
          tripId: input.tripId,
          tripSeatId: input.tripSeatId,
          releasedAt: null,
          cancelledAt: null,
          expiredAt: null,
          NOT: [
            {
              dropSequence: {
                lte: input.boardingSequence,
              },
            },
            {
              boardingSequence: {
                gte: input.dropSequence,
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
                  gt: now,
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
          id: true,
        },
      });

      if (overlappingAllocation) {
        throw new ConflictException(
          'Rail seat is already held for the requested segment.',
        );
      }

      const unitPriceCents = tripSeat.priceCents ?? tripSeat.trip.basePriceCents;
      const feesCents = tripSeat.feesCents ?? tripSeat.trip.feesCents;
      const seatLabel =
        tripSeat.seat.label ?? tripSeat.seat.seatNumber ?? tripSeat.seat.code;

      const booking = await tx.booking.create({
        data: {
          userId: input.userId,
          orgId: tripSeat.trip.orgId,
          domainType: 'RAIL',
          status: 'HOLD',
          currency: tripSeat.trip.currency,
          holdExpiresAt: expiresAt,
          idempotencyKey: input.idempotencyKey,
          metadata: {
            inventoryScopeId: input.tripId,
            tripId: input.tripId,
            boardingStationCode: input.boardingStationCode,
            dropStationCode: input.dropStationCode,
            boardingSequence: input.boardingSequence,
            dropSequence: input.dropSequence,
          } as never,
        } as never,
      });

      const bookingItem = await tx.bookingItem.create({
        data: {
          bookingId: booking.id,
          status: 'HOLD',
          inventoryType: 'rail-trip-seat',
          inventoryRefId: tripSeat.id,
          segmentRefId: `${input.boardingTripStopId}:${input.dropTripStopId}`,
          seatLabel,
          quantity: 1,
          unitPriceCents,
          feesCents,
          currency: tripSeat.trip.currency,
          snapshot: {
            tripId: input.tripId,
            tripSeatId: tripSeat.id,
            boardingTripStopId: input.boardingTripStopId,
            dropTripStopId: input.dropTripStopId,
            boardingStationCode: input.boardingStationCode,
            dropStationCode: input.dropStationCode,
            boardingSequence: input.boardingSequence,
            dropSequence: input.dropSequence,
            coachCode: tripSeat.coach.code,
            seatCode: tripSeat.seat.code,
          } as never,
          metadata: {
            inventoryScopeId: input.tripId,
          } as never,
        } as never,
      });

      await tx.railSeatAllocation.create({
        data: {
          bookingId: booking.id,
          bookingItemId: bookingItem.id,
          tripId: input.tripId,
          tripSeatId: input.tripSeatId,
          boardingTripStopId: input.boardingTripStopId,
          dropTripStopId: input.dropTripStopId,
          boardingSequence: input.boardingSequence,
          dropSequence: input.dropSequence,
        },
      });

      const createdBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        select: railHoldSelect,
      });

      return this.mapRailHold(createdBooking as RailHoldRow | null);
    });
  }

  async findPaymentTarget(
    bookingId: string,
  ): Promise<BookingPaymentTarget | null> {
    const existing = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: bookingPaymentTargetSelect,
    });

    if (existing) {
      return this.mapBookingPaymentTarget(
        existing as BookingPaymentTargetRow,
      );
    }

    const projected = await this.projectLegacyReservationToBooking(bookingId);
    return projected;
  }

  async findExpiredActiveHolds(
    limit: number,
    now: Date,
  ): Promise<ExpiredHoldCandidate[]> {
    const [expiredReservations, expiredRailBookings] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          status: 'ACTIVE',
          expiresAt: {
            lte: now,
          },
        },
        orderBy: {
          expiresAt: 'asc',
        },
        take: limit,
        select: {
          id: true,
          expiresAt: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          domainType: 'RAIL',
          status: 'HOLD',
          holdExpiresAt: {
            lte: now,
          },
        },
        orderBy: {
          holdExpiresAt: 'asc',
        },
        take: limit,
        select: {
          id: true,
          holdExpiresAt: true,
        },
      }),
    ]);

    return [
      ...expiredReservations.map((row) => ({
        id: row.id,
        source: 'reservation' as const,
        expiresAt: row.expiresAt,
      })),
      ...expiredRailBookings
        .filter((row): row is { id: string; holdExpiresAt: Date } =>
          row.holdExpiresAt instanceof Date,
        )
        .map((row) => ({
          id: row.id,
          source: 'rail-booking' as const,
          expiresAt: row.holdExpiresAt,
        })),
    ]
      .sort((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime())
      .slice(0, limit);
  }

  async expireHoldAndReleaseInventory(
    holdId: string,
    correlationId: string,
  ): Promise<ExpireBookingHoldResult> {
    return this.withTransaction(async (tx) => {
      const now = new Date();
      const reservation = await tx.reservation.findUnique({
        where: { id: holdId },
        select: {
          id: true,
          eventId: true,
          userId: true,
          status: true,
          expiresAt: true,
          items: {
            select: {
              eventSeatId: true,
            },
          },
        },
      });

      if (!reservation) {
        return this.expireRailHoldAndReleaseInventory(tx, holdId, now);
      }

      const markExpired = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: 'ACTIVE',
          expiresAt: {
            lte: now,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      });

      if (markExpired.count === 0) {
        return {
          updated: false,
          reservationId: reservation.id,
          inventoryScopeId: reservation.eventId,
          releasedInventoryRefIds: [],
        };
      }

      const seatIds = reservation.items
        .map((item) => item.eventSeatId)
        .filter((id): id is string => Boolean(id));

      const releasableSeats =
        seatIds.length > 0
          ? await tx.eventSeat.findMany({
              where: {
                id: { in: seatIds },
                eventId: reservation.eventId,
                status: 'RESERVED',
                reservedUntil: {
                  lte: now,
                },
              },
              select: {
                id: true,
              },
            })
          : [];

      const releasedInventoryRefIds = releasableSeats.map((seat) => seat.id);

      if (releasedInventoryRefIds.length > 0) {
        await tx.eventSeat.updateMany({
          where: {
            id: { in: releasedInventoryRefIds },
            eventId: reservation.eventId,
            status: 'RESERVED',
            reservedUntil: {
              lte: now,
            },
          },
          data: {
            status: 'AVAILABLE',
            reservedUntil: null,
            version: {
              increment: 1,
            },
          },
        });
      }

      await tx.booking.updateMany({
        where: {
          id: reservation.id,
          status: 'HOLD',
        },
        data: {
          status: 'EXPIRED',
          expiredAt: now,
          holdExpiresAt: reservation.expiresAt,
        } as never,
      });

      await tx.bookingItem.updateMany({
        where: {
          bookingId: reservation.id,
          status: 'HOLD',
        },
        data: {
          status: 'EXPIRED',
          expiredAt: now,
        } as never,
      });

      await tx.outboxEvent.create({
        data: {
          topic: 'reservation.expired',
          key: reservation.id,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId,
            actor: 'system',
            data: {
              reservationId: reservation.id,
              eventId: reservation.eventId,
              releasedSeatIds: releasedInventoryRefIds,
            },
          } as never,
          status: 'PENDING',
          correlationId,
          actorUserId: null,
        },
      });

      return {
        updated: true,
        reservationId: reservation.id,
        inventoryScopeId: reservation.eventId,
        releasedInventoryRefIds,
      };
    });
  }

  private async tryPessimisticSeatHold(
    tx: PrismaService,
    eventSeatId: string,
    eventId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean> {
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        WITH target AS (
          SELECT "id", "status", "reservedUntil"
          FROM "EventSeat"
          WHERE "id" = ${eventSeatId}::uuid
            AND "eventId" = ${eventId}::uuid
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "EventSeat" es
        SET "status" = 'RESERVED',
            "reservedUntil" = ${expiresAt},
            "version" = es."version" + 1
        FROM target t
        WHERE es."id" = t."id"
          AND (
            t."status" = 'AVAILABLE'
            OR (t."status" = 'RESERVED' AND t."reservedUntil" < ${now})
          )
        RETURNING es."id"
      `;

      if (rows.length > 0) {
        return true;
      }

      await this.delay(20 * attempt);
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private mapReservationHold(row: ReservationHoldRow | null): BookingHoldRecord | null {
    if (!row) {
      return null;
    }

    return {
      ...row,
      bookingId: row.id,
    };
  }

  private mapRailHold(row: RailHoldRow | null): RailBookingHoldRecord | null {
    if (!row || !row.holdExpiresAt) {
      return null;
    }

    const firstAllocation = row.items
      .flatMap((item) => item.railSeatAllocations)
      .at(0);

    if (!firstAllocation) {
      return null;
    }

    return {
      id: row.id,
      bookingId: row.id,
      tripId: firstAllocation.tripId,
      userId: row.userId,
      status: row.status,
      expiresAt: row.holdExpiresAt,
      idempotencyKey: row.idempotencyKey,
      createdAt: row.createdAt,
      requestedSegment: {
        boardingTripStopId: firstAllocation.boardingTripStopId,
        dropTripStopId: firstAllocation.dropTripStopId,
        boardingStationCode: firstAllocation.boardingTripStop.station.code,
        dropStationCode: firstAllocation.dropTripStop.station.code,
        boardingSequence: firstAllocation.boardingSequence,
        dropSequence: firstAllocation.dropSequence,
      },
      items: row.items.map((item) => {
        const allocation = item.railSeatAllocations.at(0);

        return {
          tripSeatId: allocation?.tripSeatId ?? item.inventoryRefId,
          coachCode: allocation?.tripSeat.coach.code ?? '',
          seatNo: allocation?.tripSeat.seat.seatNumber ?? '',
          seatCode: allocation?.tripSeat.seat.code ?? '',
          quantity: item.quantity,
          priceCents: item.unitPriceCents,
          feesCents: item.feesCents,
          seatLabel:
            item.seatLabel ??
            allocation?.tripSeat.seat.label ??
            allocation?.tripSeat.seat.seatNumber ??
            allocation?.tripSeat.seat.code ??
            null,
        };
      }),
    };
  }

  private mapBookingPaymentTarget(
    row: BookingPaymentTargetRow,
  ): BookingPaymentTarget {
    return {
      id: row.id,
      domainType: row.domainType.toLowerCase() as 'event' | 'rail' | 'air',
      userId: row.userId,
      status: row.status,
      holdExpiresAt: row.holdExpiresAt,
      currency: row.currency,
      inventoryScopeId:
        this.getMetadataString(row.metadata, 'inventoryScopeId') ??
        this.getMetadataString(row.metadata, 'tripId') ??
        this.getMetadataString(row.metadata, 'eventId'),
      legacyReservationId: this.getMetadataString(
        row.metadata,
        'legacyReservationId',
      ),
      items: row.items.map((item) => ({
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        feesCents: item.feesCents,
        inventoryType: item.inventoryType,
        inventoryRefId: item.inventoryRefId,
        seatLabel: item.seatLabel,
      })),
    };
  }

  private async projectLegacyReservationToBooking(
    reservationId: string,
  ): Promise<BookingPaymentTarget | null> {
    return this.withTransaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        select: {
          id: true,
          userId: true,
          status: true,
          expiresAt: true,
          idempotencyKey: true,
          eventId: true,
          event: {
            select: {
              orgId: true,
              currency: true,
            },
          },
          items: {
            select: {
              id: true,
              eventSeatId: true,
              ticketTypeId: true,
              quantity: true,
              priceCents: true,
              feesCents: true,
              eventSeat: {
                select: {
                  venueSeat: {
                    select: {
                      label: true,
                      seatNumber: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!reservation) {
        return null;
      }

      const existing = await tx.booking.findUnique({
        where: { id: reservation.id },
        select: bookingPaymentTargetSelect,
      });

      if (existing) {
        return this.mapBookingPaymentTarget(
          existing as BookingPaymentTargetRow,
        );
      }

      try {
        await tx.booking.create({
          data: {
            id: reservation.id,
            userId: reservation.userId,
            orgId: reservation.event.orgId,
            domainType: 'EVENT',
            status: this.mapReservationStatusToBookingStatus(reservation.status),
            currency: reservation.event.currency,
            holdExpiresAt: reservation.expiresAt,
            idempotencyKey: reservation.idempotencyKey,
            metadata: {
              eventId: reservation.eventId,
              legacyReservationId: reservation.id,
            } as never,
          } as never,
        });
      } catch (error) {
        const persistenceError = error as { code?: string };
        if (persistenceError.code !== 'P2002') {
          throw error;
        }
      }

      const bookingItemRows = reservation.items.map((item) => ({
        bookingId: reservation.id,
        status: this.mapReservationStatusToBookingStatus(reservation.status),
        inventoryType: item.eventSeatId ? 'event-seat' : 'event-ticket-type',
        inventoryRefId: item.eventSeatId ?? item.ticketTypeId ?? item.id,
        seatLabel:
          item.eventSeat?.venueSeat.label ??
          item.eventSeat?.venueSeat.seatNumber ??
          item.eventSeat?.venueSeat.code ??
          null,
        quantity: item.quantity,
        unitPriceCents: item.priceCents,
        feesCents: item.feesCents,
        currency: reservation.event.currency,
        snapshot: {
          eventId: reservation.eventId,
          reservationItemId: item.id,
          eventSeatId: item.eventSeatId,
          ticketTypeId: item.ticketTypeId,
        } as never,
        metadata: {
          legacyReservationId: reservation.id,
        } as never,
      }));

      const existingBookingItemsCount = await tx.bookingItem.count({
        where: {
          bookingId: reservation.id,
        },
      });

      if (bookingItemRows.length > 0 && existingBookingItemsCount === 0) {
        await tx.bookingItem.createMany({
          data: bookingItemRows as never,
          skipDuplicates: true,
        });
      }

      const createdBooking = await tx.booking.findUnique({
        where: { id: reservation.id },
        select: bookingPaymentTargetSelect,
      });

      return createdBooking
        ? this.mapBookingPaymentTarget(
            createdBooking as BookingPaymentTargetRow,
          )
        : null;
    });
  }

  private mapReservationStatusToBookingStatus(
    status: string,
  ): 'HOLD' | 'CONFIRMED' | 'EXPIRED' | 'CANCELLED' {
    switch (status) {
      case 'CONFIRMED':
        return 'CONFIRMED';
      case 'EXPIRED':
        return 'EXPIRED';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return 'HOLD';
    }
  }

  private getMetadataString(metadata: unknown, key: string): string | null {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private async releaseExpiredRailSeatAllocations(
    tx: PrismaService,
    tripId: string,
    tripSeatId: string,
    boardingSequence: number,
    dropSequence: number,
    now: Date,
  ): Promise<void> {
    const expiredAllocations = await tx.railSeatAllocation.findMany({
      where: {
        tripId,
        tripSeatId,
        releasedAt: null,
        cancelledAt: null,
        expiredAt: null,
        NOT: [
          {
            dropSequence: {
              lte: boardingSequence,
            },
          },
          {
            boardingSequence: {
              gte: dropSequence,
            },
          },
        ],
        booking: {
          status: 'HOLD',
          holdExpiresAt: {
            lte: now,
          },
        },
      },
      select: {
        id: true,
        bookingId: true,
      },
    });

    if (expiredAllocations.length === 0) {
      return;
    }

    const bookingIds = [...new Set(expiredAllocations.map((item) => item.bookingId))];
    const allocationIds = expiredAllocations.map((item) => item.id);

    await tx.booking.updateMany({
      where: {
        id: {
          in: bookingIds,
        },
        status: 'HOLD',
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      } as never,
    });

    await tx.bookingItem.updateMany({
      where: {
        bookingId: {
          in: bookingIds,
        },
        status: 'HOLD',
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      } as never,
    });

    await tx.railSeatAllocation.updateMany({
      where: {
        id: {
          in: allocationIds,
        },
        releasedAt: null,
        cancelledAt: null,
        expiredAt: null,
      },
      data: {
        expiredAt: now,
        releasedAt: now,
      },
    });
  }

  private async expireRailHoldAndReleaseInventory(
    tx: PrismaService,
    holdId: string,
    now: Date,
  ): Promise<ExpireBookingHoldResult> {
    const booking = await tx.booking.findFirst({
      where: {
        id: holdId,
        domainType: 'RAIL',
      },
      select: {
        id: true,
        status: true,
        holdExpiresAt: true,
        metadata: true,
        items: {
          select: {
            inventoryRefId: true,
          },
        },
      },
    });

    if (!booking) {
      return {
        updated: false,
        reservationId: holdId,
        inventoryScopeId: '',
        releasedInventoryRefIds: [],
      };
    }

    const markExpired = await tx.booking.updateMany({
      where: {
        id: booking.id,
        domainType: 'RAIL',
        status: 'HOLD',
        holdExpiresAt: {
          lte: now,
        },
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      } as never,
    });

    if (markExpired.count === 0) {
      return {
        updated: false,
        reservationId: booking.id,
        inventoryScopeId:
          this.getMetadataString(booking.metadata, 'inventoryScopeId') ??
          this.getMetadataString(booking.metadata, 'tripId') ??
          '',
        releasedInventoryRefIds: [],
      };
    }

    await tx.bookingItem.updateMany({
      where: {
        bookingId: booking.id,
        status: 'HOLD',
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      } as never,
    });

    const activeAllocations = await tx.railSeatAllocation.findMany({
      where: {
        bookingId: booking.id,
        releasedAt: null,
        cancelledAt: null,
        expiredAt: null,
      },
      select: {
        id: true,
        tripSeatId: true,
        tripId: true,
      },
    });

    if (activeAllocations.length > 0) {
      await tx.railSeatAllocation.updateMany({
        where: {
          id: {
            in: activeAllocations.map((allocation) => allocation.id),
          },
          releasedAt: null,
          cancelledAt: null,
          expiredAt: null,
        },
        data: {
          expiredAt: now,
          releasedAt: now,
        },
      });
    }

    return {
      updated: true,
      reservationId: booking.id,
      inventoryScopeId:
        activeAllocations[0]?.tripId ??
        this.getMetadataString(booking.metadata, 'inventoryScopeId') ??
        this.getMetadataString(booking.metadata, 'tripId') ??
        '',
      releasedInventoryRefIds: [
        ...new Set(activeAllocations.map((allocation) => allocation.tripSeatId)),
      ],
    };
  }
}



