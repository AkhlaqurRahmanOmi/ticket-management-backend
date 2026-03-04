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
  AirIssuedDocumentRow,
  IssuedDocumentKind,
  IssuedDocumentRecord,
  IssueDocumentsInput,
  IssueDocumentsResult,
  RailIssuedDocumentRow,
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

  async findRailIssuedDocumentById(
    documentId: string,
  ): Promise<IssuedDocumentRecord | null> {
    const rows = await this.prisma.$queryRaw<RailIssuedDocumentRow[]>`
      SELECT
        "id",
        "status",
        "code",
        "issuedAt",
        "bookingId",
        "paymentId",
        "userId",
        "tripId",
        "tripSeatId",
        "metadata"
      FROM "RailIssuedDocument"
      WHERE "id" = ${documentId}::uuid
      LIMIT 1
    `;

    return rows[0] ? this.mapRailIssuedDocument(rows[0]) : null;
  }

  async findRailIssuedDocumentsByUserId(
    userId: string,
  ): Promise<IssuedDocumentRecord[]> {
    const rows = await this.prisma.$queryRaw<RailIssuedDocumentRow[]>`
      SELECT
        "id",
        "status",
        "code",
        "issuedAt",
        "bookingId",
        "paymentId",
        "userId",
        "tripId",
        "tripSeatId",
        "metadata"
      FROM "RailIssuedDocument"
      WHERE "userId" = ${userId}::uuid
      ORDER BY "issuedAt" DESC
    `;

    return rows.map((row) => this.mapRailIssuedDocument(row));
  }

  async findAirIssuedDocumentById(
    documentId: string,
  ): Promise<IssuedDocumentRecord | null> {
    const rows = await this.prisma.$queryRaw<AirIssuedDocumentRow[]>`
      SELECT
        "id",
        "status",
        "code",
        "issuedAt",
        "bookingId",
        "paymentId",
        "userId",
        "flightInstanceId",
        "flightCabinInventoryId",
        "metadata"
      FROM "AirIssuedDocument"
      WHERE "id" = ${documentId}::uuid
      LIMIT 1
    `;

    return rows[0] ? this.mapAirIssuedDocument(rows[0]) : null;
  }

  async findAirIssuedDocumentsByUserId(
    userId: string,
  ): Promise<IssuedDocumentRecord[]> {
    const rows = await this.prisma.$queryRaw<AirIssuedDocumentRow[]>`
      SELECT
        "id",
        "status",
        "code",
        "issuedAt",
        "bookingId",
        "paymentId",
        "userId",
        "flightInstanceId",
        "flightCabinInventoryId",
        "metadata"
      FROM "AirIssuedDocument"
      WHERE "userId" = ${userId}::uuid
      ORDER BY "issuedAt" DESC
    `;

    return rows.map((row) => this.mapAirIssuedDocument(row));
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

  async finalizeRailIssuedDocumentsFromPaymentSucceeded(
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
          domainType: true,
          status: true,
          amountCents: true,
          currency: true,
          reservationId: true,
          booking: {
            select: {
              id: true,
              userId: true,
              domainType: true,
              status: true,
              holdExpiresAt: true,
              currency: true,
              metadata: true,
              items: {
                select: {
                  id: true,
                  status: true,
                  quantity: true,
                  unitPriceCents: true,
                  feesCents: true,
                  inventoryRefId: true,
                  seatLabel: true,
                  segmentRefId: true,
                  railSeatAllocations: {
                    where: {
                      releasedAt: null,
                      cancelledAt: null,
                      expiredAt: null,
                    },
                    select: {
                      id: true,
                      tripId: true,
                      tripSeatId: true,
                      boardingSequence: true,
                      dropSequence: true,
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      const existingDocuments = await tx.$queryRaw<RailIssuedDocumentRow[]>`
        SELECT
          "id",
          "status",
          "code",
          "issuedAt",
          "bookingId",
          "paymentId",
          "userId",
          "tripId",
          "tripSeatId",
          "metadata"
        FROM "RailIssuedDocument"
        WHERE "paymentId" = ${payment.id}::uuid
        ORDER BY "issuedAt" DESC
      `;

      if (payment.status !== 'SUCCEEDED') {
        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          orderId: null,
          reservationId: payment.reservationId,
          inventoryScopeId: payment.bookingId
            ? this.getMetadataString(payment.booking?.metadata, 'inventoryScopeId')
            : null,
          issuedDocumentIds: existingDocuments.map((document) => document.id),
          affectedInventoryRefIds: [],
          reason: 'payment_not_succeeded',
        };
      }

      if (existingDocuments.length > 0) {
        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          orderId: null,
          reservationId: payment.reservationId,
          inventoryScopeId:
            existingDocuments[0]?.tripId ??
            this.getMetadataString(payment.booking?.metadata, 'inventoryScopeId'),
          issuedDocumentIds: existingDocuments.map((document) => document.id),
          affectedInventoryRefIds: [
            ...new Set(existingDocuments.map((document) => document.tripSeatId)),
          ],
          reason: 'already_finalized',
        };
      }

      const booking = payment.booking;
      if (!booking || booking.domainType !== 'RAIL') {
        throw new ConflictException(
          'Payment is not linked to a rail booking. Manual remediation required.',
        );
      }

      if (
        booking.status === 'EXPIRED' ||
        booking.status === 'CANCELLED' ||
        (booking.status === 'HOLD' &&
          booking.holdExpiresAt instanceof Date &&
          booking.holdExpiresAt <= now)
      ) {
        throw new ConflictException(
          'Rail booking is no longer active. Manual remediation/refund required.',
        );
      }

      const totalCents = booking.items.reduce(
        (sum, item) => sum + item.quantity * (item.unitPriceCents + item.feesCents),
        0,
      );

      if (payment.amountCents !== totalCents) {
        throw new ConflictException(
          'Payment amount does not match rail booking total.',
        );
      }

      if (payment.currency.toUpperCase() !== booking.currency.toUpperCase()) {
        throw new ConflictException(
          'Payment currency does not match rail booking currency.',
        );
      }

      const issuedDocumentIds: string[] = [];
      const affectedInventoryRefIds: string[] = [];

      for (const item of booking.items) {
        if (item.quantity !== 1) {
          throw new ConflictException(
            'Rail seat booking item quantity must be 1.',
          );
        }

        const allocation = item.railSeatAllocations[0];
        if (!allocation) {
          throw new ConflictException(
            `Rail booking item ${item.id} has no active seat allocation.`,
          );
        }

        const documentId = randomUUID();
        const documentCode = this.buildRailDocumentCode(
          booking.id,
          item.id,
          issuedDocumentIds.length,
        );
        const metadata = {
          inventoryScopeId: allocation.tripId,
          inventoryRefId: allocation.tripSeatId,
          segmentRefId: item.segmentRefId,
          seatLabel: item.seatLabel,
          boardingStationCode: allocation.boardingTripStop.station.code,
          dropStationCode: allocation.dropTripStop.station.code,
        };

        await tx.$queryRaw`
          INSERT INTO "RailIssuedDocument" (
            "id",
            "bookingId",
            "bookingItemId",
            "paymentId",
            "userId",
            "tripId",
            "tripSeatId",
            "status",
            "code",
            "issuedAt",
            "metadata",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${documentId}::uuid,
            ${booking.id}::uuid,
            ${item.id}::uuid,
            ${payment.id}::uuid,
            ${booking.userId}::uuid,
            ${allocation.tripId}::uuid,
            ${allocation.tripSeatId}::uuid,
            'ISSUED',
            ${documentCode},
            ${now},
            CAST(${JSON.stringify(metadata)} AS jsonb),
            ${now},
            ${now}
          )
        `;

        issuedDocumentIds.push(documentId);
        affectedInventoryRefIds.push(allocation.tripSeatId);
      }

      await tx.booking.updateMany({
        where: {
          id: booking.id,
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
          bookingId: booking.id,
          status: 'HOLD',
        },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
        } as never,
      });

      await tx.railSeatAllocation.updateMany({
        where: {
          bookingId: booking.id,
          releasedAt: null,
          cancelledAt: null,
          expiredAt: null,
          confirmedAt: null,
        },
        data: {
          confirmedAt: now,
        },
      });

      await tx.outboxEvent.create({
        data: {
          topic: 'ticket.issued',
          key: booking.id,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId: input.correlationId ?? null,
            actor: input.actor ?? booking.userId,
            data: {
              paymentId: payment.id,
              bookingId: booking.id,
              tripId:
                this.getMetadataString(booking.metadata, 'tripId') ??
                this.getMetadataString(booking.metadata, 'inventoryScopeId'),
              issuedDocumentIds,
              tripSeatIds: [...new Set(affectedInventoryRefIds)],
            },
          } as never,
          status: 'PENDING',
          correlationId: input.correlationId ?? null,
          actorUserId: booking.userId,
        },
      });

      return {
        processed: true,
        idempotent: false,
        paymentId: payment.id,
        bookingId: booking.id,
        orderId: null,
        reservationId: payment.reservationId,
        inventoryScopeId:
          this.getMetadataString(booking.metadata, 'tripId') ??
          this.getMetadataString(booking.metadata, 'inventoryScopeId'),
        issuedDocumentIds,
        affectedInventoryRefIds: [...new Set(affectedInventoryRefIds)],
      };
    });
  }

  async finalizeAirIssuedDocumentsFromPaymentSucceeded(
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
          domainType: true,
          status: true,
          amountCents: true,
          currency: true,
          reservationId: true,
          booking: {
            select: {
              id: true,
              userId: true,
              domainType: true,
              status: true,
              holdExpiresAt: true,
              currency: true,
              metadata: true,
              items: {
                select: {
                  id: true,
                  status: true,
                  quantity: true,
                  unitPriceCents: true,
                  feesCents: true,
                  inventoryRefId: true,
                  seatLabel: true,
                  segmentRefId: true,
                  snapshot: true,
                  airCabinAllocations: {
                    where: {
                      releasedAt: null,
                      cancelledAt: null,
                      expiredAt: null,
                    },
                    select: {
                      id: true,
                      flightInstanceId: true,
                      flightCabinInventoryId: true,
                      originSequence: true,
                      destinationSequence: true,
                      quantity: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      const existingDocuments = await tx.$queryRaw<AirIssuedDocumentRow[]>`
        SELECT
          "id",
          "status",
          "code",
          "issuedAt",
          "bookingId",
          "paymentId",
          "userId",
          "flightInstanceId",
          "flightCabinInventoryId",
          "metadata"
        FROM "AirIssuedDocument"
        WHERE "paymentId" = ${payment.id}::uuid
        ORDER BY "issuedAt" DESC
      `;

      if (payment.status !== 'SUCCEEDED') {
        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          orderId: null,
          reservationId: payment.reservationId,
          inventoryScopeId: payment.bookingId
            ? this.getMetadataString(payment.booking?.metadata, 'inventoryScopeId')
            : null,
          issuedDocumentIds: existingDocuments.map((document) => document.id),
          affectedInventoryRefIds: [],
          reason: 'payment_not_succeeded',
        };
      }

      if (existingDocuments.length > 0) {
        return {
          processed: false,
          idempotent: true,
          paymentId: payment.id,
          bookingId: payment.bookingId,
          orderId: null,
          reservationId: payment.reservationId,
          inventoryScopeId:
            existingDocuments[0]?.flightInstanceId ??
            this.getMetadataString(payment.booking?.metadata, 'inventoryScopeId'),
          issuedDocumentIds: existingDocuments.map((document) => document.id),
          affectedInventoryRefIds: [
            ...new Set(
              existingDocuments.map(
                (document) => document.flightCabinInventoryId,
              ),
            ),
          ],
          reason: 'already_finalized',
        };
      }

      const booking = payment.booking;
      if (!booking || booking.domainType !== 'AIR') {
        throw new ConflictException(
          'Payment is not linked to an air booking. Manual remediation required.',
        );
      }

      if (
        booking.status === 'EXPIRED' ||
        booking.status === 'CANCELLED' ||
        (booking.status === 'HOLD' &&
          booking.holdExpiresAt instanceof Date &&
          booking.holdExpiresAt <= now)
      ) {
        throw new ConflictException(
          'Air booking is no longer active. Manual remediation/refund required.',
        );
      }

      const totalCents = booking.items.reduce(
        (sum, item) => sum + item.quantity * (item.unitPriceCents + item.feesCents),
        0,
      );

      if (payment.amountCents !== totalCents) {
        throw new ConflictException(
          'Payment amount does not match air booking total.',
        );
      }

      if (payment.currency.toUpperCase() !== booking.currency.toUpperCase()) {
        throw new ConflictException(
          'Payment currency does not match air booking currency.',
        );
      }

      const issuedDocumentIds: string[] = [];
      const affectedInventoryRefIds: string[] = [];
      const bookingReference = this.buildAirBookingReference(booking.id);

      for (const item of booking.items) {
        const allocation = item.airCabinAllocations[0];
        if (!allocation) {
          throw new ConflictException(
            `Air booking item ${item.id} has no active cabin allocation.`,
          );
        }

        const snapshot = this.parseMetadata(item.snapshot);
        const cabinCode = this.getMetadataString(snapshot, 'cabinCode');
        const fareClassCode = this.getMetadataString(snapshot, 'fareClassCode');
        const originAirportCode = this.getMetadataString(
          snapshot,
          'originAirportCode',
        );
        const destinationAirportCode = this.getMetadataString(
          snapshot,
          'destinationAirportCode',
        );

        for (let index = 0; index < item.quantity; index++) {
          const documentId = randomUUID();
          const documentCode = this.buildAirDocumentCode(
            booking.id,
            item.id,
            index,
          );
          const metadata = {
            inventoryScopeId: allocation.flightInstanceId,
            inventoryRefId: allocation.flightCabinInventoryId,
            categoryRefId: fareClassCode,
            segmentRefId: item.segmentRefId,
            seatLabel: item.seatLabel,
            originAirportCode,
            destinationAirportCode,
            cabinCode,
            fareClassCode,
            bookingReference,
            quantityIndex: index + 1,
          };

          await tx.$executeRaw`
            INSERT INTO "AirIssuedDocument" (
              "id",
              "bookingId",
              "bookingItemId",
              "paymentId",
              "userId",
              "flightInstanceId",
              "flightCabinInventoryId",
              "status",
              "code",
              "issuedAt",
              "metadata",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${documentId}::uuid,
              ${booking.id}::uuid,
              ${item.id}::uuid,
              ${payment.id}::uuid,
              ${booking.userId}::uuid,
              ${allocation.flightInstanceId}::uuid,
              ${allocation.flightCabinInventoryId}::uuid,
              'ISSUED',
              ${documentCode},
              ${now},
              CAST(${JSON.stringify(metadata)} AS jsonb),
              ${now},
              ${now}
            )
          `;

          issuedDocumentIds.push(documentId);
        }

        affectedInventoryRefIds.push(allocation.flightCabinInventoryId);
      }

      await tx.booking.updateMany({
        where: {
          id: booking.id,
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
          bookingId: booking.id,
          status: 'HOLD',
        },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
        } as never,
      });

      await tx.$executeRaw`
        UPDATE "AirCabinAllocation"
        SET "confirmedAt" = ${now}
        WHERE "bookingId" = ${booking.id}::uuid
          AND "releasedAt" IS NULL
          AND "cancelledAt" IS NULL
          AND "expiredAt" IS NULL
          AND "confirmedAt" IS NULL
      `;

      await tx.outboxEvent.create({
        data: {
          topic: 'ticket.issued',
          key: booking.id,
          payload: {
            eventId: randomUUID(),
            occurredAt: now.toISOString(),
            version: 1,
            correlationId: input.correlationId ?? null,
            actor: input.actor ?? booking.userId,
            data: {
              paymentId: payment.id,
              bookingId: booking.id,
              flightInstanceId:
                this.getMetadataString(booking.metadata, 'flightInstanceId') ??
                this.getMetadataString(booking.metadata, 'inventoryScopeId'),
              bookingReference,
              issuedDocumentIds,
              flightCabinInventoryIds: [
                ...new Set(affectedInventoryRefIds),
              ],
            },
          } as never,
          status: 'PENDING',
          correlationId: input.correlationId ?? null,
          actorUserId: booking.userId,
        },
      });

      return {
        processed: true,
        idempotent: false,
        paymentId: payment.id,
        bookingId: booking.id,
        orderId: null,
        reservationId: payment.reservationId,
        inventoryScopeId:
          this.getMetadataString(booking.metadata, 'flightInstanceId') ??
          this.getMetadataString(booking.metadata, 'inventoryScopeId'),
        issuedDocumentIds,
        affectedInventoryRefIds: [...new Set(affectedInventoryRefIds)],
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

  private mapRailIssuedDocument(
    document: RailIssuedDocumentRow,
  ): IssuedDocumentRecord {
    const metadata = this.parseMetadata(document.metadata);

    return {
      id: document.id,
      domainType: BookingDomain.RAIL,
      kind: 'RAIL_TICKET',
      status: document.status,
      documentNumber: document.code,
      bookingId: document.bookingId,
      orderId: null,
      ownerUserId: document.userId,
      issuedAt: document.issuedAt,
      metadata: {
        inventoryScopeId: document.tripId,
        inventoryRefId: document.tripSeatId,
        segmentRefId: this.getMetadataString(metadata, 'segmentRefId'),
        seatLabel: this.getMetadataString(metadata, 'seatLabel'),
        boardingStationCode: this.getMetadataString(
          metadata,
          'boardingStationCode',
        ),
        dropStationCode: this.getMetadataString(metadata, 'dropStationCode'),
      },
    };
  }

  private mapAirIssuedDocument(
    document: AirIssuedDocumentRow,
  ): IssuedDocumentRecord {
    const metadata = this.parseMetadata(document.metadata);

    return {
      id: document.id,
      domainType: BookingDomain.AIR,
      kind: 'AIR_TICKET',
      status: document.status,
      documentNumber: document.code,
      bookingId: document.bookingId,
      orderId: null,
      ownerUserId: document.userId,
      issuedAt: document.issuedAt,
      metadata: {
        inventoryScopeId: document.flightInstanceId,
        inventoryRefId: document.flightCabinInventoryId,
        categoryRefId: this.getMetadataString(metadata, 'categoryRefId'),
        segmentRefId: this.getMetadataString(metadata, 'segmentRefId'),
        seatLabel: this.getMetadataString(metadata, 'seatLabel'),
        originAirportCode: this.getMetadataString(metadata, 'originAirportCode'),
        destinationAirportCode: this.getMetadataString(
          metadata,
          'destinationAirportCode',
        ),
        cabinCode: this.getMetadataString(metadata, 'cabinCode'),
        fareClassCode: this.getMetadataString(metadata, 'fareClassCode'),
        bookingReference: this.getMetadataString(metadata, 'bookingReference'),
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

  private buildRailDocumentCode(
    bookingId: string,
    bookingItemId: string,
    index: number,
  ): string {
    return `rail_${bookingId.slice(0, 8)}_${bookingItemId.slice(0, 8)}_${index + 1}`;
  }

  private buildAirDocumentCode(
    bookingId: string,
    bookingItemId: string,
    index: number,
  ): string {
    return `air_${bookingId.slice(0, 8)}_${bookingItemId.slice(0, 8)}_${index + 1}`;
  }

  private buildAirBookingReference(bookingId: string): string {
    return `PNR${bookingId.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
  }

  private parseMetadata(metadata: unknown): Record<string, unknown> {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata) as unknown;
        return this.parseMetadata(parsed);
      } catch {
        return {};
      }
    }

    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
      return metadata as Record<string, unknown>;
    }

    return {};
  }

  private getMetadataString(
    metadata: Record<string, unknown> | unknown,
    key: string,
  ): string | null {
    const source =
      typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
    const value = source[key];

    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
