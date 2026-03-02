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
  type BookingPaymentTargetRow,
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

  findExpiredActiveHolds(limit: number, now: Date) {
    return this.prisma.reservation.findMany({
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
      },
    });
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
        return {
          updated: false,
          reservationId: holdId,
          inventoryScopeId: '',
          releasedInventoryRefIds: [],
        };
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

  private mapBookingPaymentTarget(
    row: BookingPaymentTargetRow,
  ): BookingPaymentTarget {
    return {
      id: row.id,
      userId: row.userId,
      status: row.status,
      holdExpiresAt: row.holdExpiresAt,
      currency: row.currency,
      inventoryScopeId: this.getMetadataString(row.metadata, 'eventId'),
      legacyReservationId:
        this.getMetadataString(row.metadata, 'legacyReservationId') ?? row.id,
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
}



