import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

type CreateSeatReservationInput = {
  userId: string;
  eventId: string;
  eventSeatId: string;
  idempotencyKey: string;
  ttlMinutes: number;
  correlationId: string;
};

type ExpireReservationResult = {
  updated: boolean;
  reservationId: string;
  eventId: string;
  releasedSeatIds: string[];
};

@Injectable()
export class ReservationsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findByUserAndIdempotencyKey(userId: string, idempotencyKey: string) {
    return this.prisma.reservation.findUnique({
      where: {
        userId_idempotencyKey: {
          userId,
          idempotencyKey,
        },
      },
      select: {
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
      },
    });
  }

  findReservationById(reservationId: string) {
    return this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
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
      },
    });
  }

  async createSeatReservation(input: CreateSeatReservationInput) {
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
          ticketType: {
            select: {
              priceCents: true,
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

      return tx.reservation.findUnique({
        where: { id: reservation.id },
        select: {
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
        },
      });
    });
  }

  findExpiredActiveReservations(limit: number, now: Date) {
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

  async expireReservationAndReleaseSeats(
    reservationId: string,
    correlationId: string,
  ): Promise<ExpireReservationResult> {
    return this.withTransaction(async (tx) => {
      const now = new Date();
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
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
          reservationId,
          eventId: '',
          releasedSeatIds: [],
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
          eventId: reservation.eventId,
          releasedSeatIds: [],
        };
      }

      const seatIds = reservation.items
        .map((item) => item.eventSeatId)
        .filter((id): id is string => Boolean(id));

      const releasedSeatIds: string[] = [];
      for (const seatId of seatIds) {
        const released = await tx.eventSeat.updateMany({
          where: {
            id: seatId,
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

        if (released.count > 0) {
          releasedSeatIds.push(seatId);
        }
      }

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
              releasedSeatIds,
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
        eventId: reservation.eventId,
        releasedSeatIds,
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
}
