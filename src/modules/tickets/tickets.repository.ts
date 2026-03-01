import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

type FinalizePaymentSucceededInput = {
  paymentId: string;
  correlationId?: string | null;
  actor?: string;
};

type PaymentSucceededFinalizationResult = {
  processed: boolean;
  idempotent: boolean;
  paymentId: string;
  orderId: string | null;
  reservationId: string | null;
  eventId: string | null;
  ticketIds: string[];
  soldSeatIds: string[];
  reason?: string;
};

@Injectable()
export class TicketsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findTicketById(ticketId: string) {
    return this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        code: true,
        status: true,
        issuedAt: true,
        eventId: true,
        orderId: true,
        userId: true,
        eventSeatId: true,
        ticketTypeId: true,
      },
    });
  }

  findTicketsByUserId(userId: string) {
    return this.prisma.ticket.findMany({
      where: { userId },
      select: {
        id: true,
        code: true,
        status: true,
        issuedAt: true,
        eventId: true,
        orderId: true,
        eventSeatId: true,
        ticketTypeId: true,
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }

  async finalizeFromPaymentSucceeded(
    input: FinalizePaymentSucceededInput,
  ): Promise<PaymentSucceededFinalizationResult> {
    return this.withTransaction(async (tx) => {
      const now = new Date();

      await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "Payment"
        WHERE "id" = ${input.paymentId}::uuid
        FOR UPDATE
      `;

      const payment = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: {
          id: true,
          status: true,
          amountCents: true,
          currency: true,
          orderId: true,
          reservationId: true,
          reservation: {
            select: {
              id: true,
              eventId: true,
              userId: true,
              status: true,
              expiresAt: true,
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
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      if (payment.status !== 'SUCCEEDED') {
        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          orderId: payment.orderId,
          reservationId: payment.reservationId,
          eventId: payment.reservation?.eventId ?? null,
          ticketIds: [],
          soldSeatIds: [],
          reason: 'payment_not_succeeded',
        };
      }

      if (payment.orderId) {
        const existingTickets = await tx.ticket.findMany({
          where: { orderId: payment.orderId },
          select: { id: true },
        });

        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          orderId: payment.orderId,
          reservationId: payment.reservationId,
          eventId: payment.reservation?.eventId ?? null,
          ticketIds: existingTickets.map((ticket) => ticket.id),
          soldSeatIds: [],
          reason: 'already_finalized',
        };
      }

      const reservation = payment.reservation;
      if (!reservation) {
        throw new ConflictException(
          'Payment is not linked to a reservation. Manual remediation required.',
        );
      }

      if (reservation.status !== 'ACTIVE' || reservation.expiresAt <= now) {
        throw new ConflictException(
          'Reservation is no longer ACTIVE. Manual remediation/refund required.',
        );
      }

      const subtotalCents = reservation.items.reduce(
        (total, item) => total + item.priceCents * item.quantity,
        0,
      );
      const feesCents = reservation.items.reduce(
        (total, item) => total + item.feesCents * item.quantity,
        0,
      );
      const totalCents = subtotalCents + feesCents;

      if (payment.amountCents !== totalCents) {
        throw new ConflictException(
          'Payment amount does not match reservation total.',
        );
      }

      if (
        payment.currency.toUpperCase() !== reservation.event.currency.toUpperCase()
      ) {
        throw new ConflictException(
          'Payment currency does not match reservation currency.',
        );
      }

      const order = await tx.order.create({
        data: {
          eventId: reservation.eventId,
          userId: reservation.userId,
          orgId: reservation.event.orgId,
          status: 'PAID',
          subtotalCents,
          feesCents,
          totalCents,
          paidAt: now,
        },
        select: {
          id: true,
        },
      });

      const createdTicketIds: string[] = [];
      const soldSeatIds: string[] = [];

      for (const item of reservation.items) {
        if (item.eventSeatId && item.quantity !== 1) {
          throw new ConflictException(
            'Seat-based reservation item quantity must be 1.',
          );
        }

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            reservationItemId: item.id,
            eventSeatId: item.eventSeatId,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            priceCents: item.priceCents,
            feesCents: item.feesCents,
            lineTotalCents: (item.priceCents + item.feesCents) * item.quantity,
          },
          select: {
            id: true,
          },
        });

        if (item.eventSeatId) {
          const seatUpdate = await tx.eventSeat.updateMany({
            where: {
              id: item.eventSeatId,
              eventId: reservation.eventId,
              status: 'RESERVED',
            },
            data: {
              status: 'SOLD',
              reservedUntil: null,
              version: {
                increment: 1,
              },
            },
          });

          if (seatUpdate.count === 0) {
            throw new ConflictException(
              `Seat ${item.eventSeatId} is not RESERVED. Manual remediation required.`,
            );
          }

          soldSeatIds.push(item.eventSeatId);
        }

        for (let index = 0; index < item.quantity; index++) {
          const ticket = await tx.ticket.create({
            data: {
              eventId: reservation.eventId,
              orderId: order.id,
              userId: reservation.userId,
              eventSeatId: item.eventSeatId ?? null,
              ticketTypeId: item.ticketTypeId ?? null,
              orderItemId: orderItem.id,
              code: this.buildTicketCode(order.id, item.id, index),
              status: 'ISSUED',
            },
            select: {
              id: true,
            },
          });

          createdTicketIds.push(ticket.id);
        }
      }

      const confirmedReservation = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: 'ACTIVE',
          expiresAt: {
            gt: now,
          },
        },
        data: {
          status: 'CONFIRMED',
        },
      });

      if (confirmedReservation.count === 0) {
        throw new ConflictException(
          'Reservation could not be confirmed. Manual remediation required.',
        );
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          orderId: order.id,
        },
      });

      const outboxRows: Array<{
        topic: string;
        key: string;
        payload: never;
        status: 'PENDING';
        correlationId: string | null;
        actorUserId: string;
      }> = [
        {
          topic: 'ticket.issued',
          key: order.id,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId: input.correlationId ?? null,
            actor: input.actor ?? reservation.userId,
            data: {
              paymentId: payment.id,
              reservationId: reservation.id,
              orderId: order.id,
              ticketIds: createdTicketIds,
            },
          } as never,
          status: 'PENDING',
          correlationId: input.correlationId ?? null,
          actorUserId: reservation.userId,
        },
      ];

      if (soldSeatIds.length > 0) {
        outboxRows.push({
          topic: 'seat.sold',
          key: reservation.eventId,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId: input.correlationId ?? null,
            actor: input.actor ?? reservation.userId,
            data: {
              paymentId: payment.id,
              reservationId: reservation.id,
              orderId: order.id,
              eventId: reservation.eventId,
              seatIds: soldSeatIds,
            },
          } as never,
          status: 'PENDING',
          correlationId: input.correlationId ?? null,
          actorUserId: reservation.userId,
        });
      }

      await tx.outboxEvent.createMany({
        data: outboxRows,
      });

      return {
        processed: true,
        idempotent: false,
        paymentId: payment.id,
        orderId: order.id,
        reservationId: reservation.id,
        eventId: reservation.eventId,
        ticketIds: createdTicketIds,
        soldSeatIds,
      };
    });
  }

  private buildTicketCode(
    orderId: string,
    reservationItemId: string,
    index: number,
  ): string {
    return `tkt_${orderId}_${reservationItemId}_${index + 1}`;
  }
}
