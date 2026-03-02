import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BookingDomain } from '@/generated/prisma/enums';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';
import type {
  IssuedDocumentKind,
  IssuedDocumentRecord,
  IssueDocumentsInput,
  IssueDocumentsResult,
  TicketIssuedDocumentRow,
} from './types/issued-document.types';

@Injectable()
export class IssuanceRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async findIssuedDocumentById(
    documentId: string,
  ): Promise<IssuedDocumentRecord | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        domainType: true,
        code: true,
        status: true,
        issuedAt: true,
        userId: true,
        eventId: true,
        orderId: true,
        eventSeatId: true,
        ticketTypeId: true,
        order: {
          select: {
            payments: {
              select: {
                bookingId: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!ticket) {
      return null;
    }

    return this.mapTicketToIssuedDocument(ticket);
  }

  async findIssuedDocumentsByUserId(
    userId: string,
  ): Promise<IssuedDocumentRecord[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId },
      select: {
        id: true,
        domainType: true,
        code: true,
        status: true,
        issuedAt: true,
        userId: true,
        eventId: true,
        orderId: true,
        eventSeatId: true,
        ticketTypeId: true,
        order: {
          select: {
            payments: {
              select: {
                bookingId: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return tickets.map((ticket) => this.mapTicketToIssuedDocument(ticket));
  }

  async finalizeIssuedDocumentsFromPaymentSucceeded(
    input: IssueDocumentsInput,
  ): Promise<IssueDocumentsResult> {
    return this.withTransaction(async (tx) => {
      const now = new Date();

      await tx.$queryRaw`
        SELECT "id"
        FROM "Payment"
        WHERE "id" = ${input.paymentId}::uuid
        FOR UPDATE
      `;

      const payment = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: {
          id: true,
          bookingId: true,
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
          bookingId: payment.bookingId,
          orderId: payment.orderId,
          reservationId: payment.reservationId,
          inventoryScopeId: payment.reservation?.eventId ?? null,
          issuedDocumentIds: [],
          affectedInventoryRefIds: [],
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
          bookingId: payment.bookingId,
          orderId: payment.orderId,
          reservationId: payment.reservationId,
          inventoryScopeId: payment.reservation?.eventId ?? null,
          issuedDocumentIds: existingTickets.map((ticket) => ticket.id),
          affectedInventoryRefIds: [],
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

      const issuedDocumentIds: string[] = [];
      const affectedInventoryRefIds: string[] = [];

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

          affectedInventoryRefIds.push(item.eventSeatId);
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

          issuedDocumentIds.push(ticket.id);
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

      if (payment.bookingId) {
        await tx.booking.updateMany({
          where: {
            id: payment.bookingId,
            status: 'HOLD',
          },
          data: {
            status: 'CONFIRMED',
            confirmedAt: now,
            holdExpiresAt: null,
          } as never,
        });

        await tx.bookingItem.updateMany({
          where: {
            bookingId: payment.bookingId,
            status: 'HOLD',
          },
          data: {
            status: 'CONFIRMED',
            confirmedAt: now,
          } as never,
        });
      }

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          orderId: order.id,
        },
      });

      const outboxRows = [
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
              bookingId: payment.bookingId,
              reservationId: reservation.id,
              orderId: order.id,
              issuedDocumentIds,
            },
          } as never,
          status: 'PENDING' as const,
          correlationId: input.correlationId ?? null,
          actorUserId: reservation.userId,
        },
      ];

      if (affectedInventoryRefIds.length > 0) {
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
              bookingId: payment.bookingId,
              reservationId: reservation.id,
              orderId: order.id,
              eventId: reservation.eventId,
              seatIds: affectedInventoryRefIds,
            },
          } as never,
          status: 'PENDING' as const,
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
        bookingId: payment.bookingId,
        orderId: order.id,
        reservationId: reservation.id,
        inventoryScopeId: reservation.eventId,
        issuedDocumentIds,
        affectedInventoryRefIds,
      };
    });
  }

  private mapTicketToIssuedDocument(
    ticket: TicketIssuedDocumentRow,
  ): IssuedDocumentRecord {
    return {
      id: ticket.id,
      domainType: ticket.domainType,
      kind: this.resolveDocumentKind(ticket.domainType),
      status: ticket.status,
      documentNumber: ticket.code,
      bookingId: ticket.order.payments[0]?.bookingId ?? null,
      orderId: ticket.orderId,
      ownerUserId: ticket.userId,
      issuedAt: ticket.issuedAt,
      metadata: {
        inventoryScopeId: ticket.eventId,
        inventoryRefId: ticket.eventSeatId,
        categoryRefId: ticket.ticketTypeId,
      },
    };
  }

  private resolveDocumentKind(domainType: BookingDomain): IssuedDocumentKind {
    switch (domainType) {
      case BookingDomain.RAIL:
        return 'RAIL_TICKET';
      case BookingDomain.AIR:
        return 'AIR_TICKET';
      case BookingDomain.EVENT:
      default:
        return 'EVENT_TICKET';
    }
  }

  private buildTicketCode(
    orderId: string,
    reservationItemId: string,
    index: number,
  ): string {
    return `tkt_${orderId}_${reservationItemId}_${index + 1}`;
  }
}
