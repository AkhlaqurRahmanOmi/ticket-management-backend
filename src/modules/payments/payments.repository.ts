import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

type CreatePendingPaymentInput = {
  reservationId: string;
  provider: string;
  providerRef: string;
  amountCents: number;
  currency: string;
};

type ProcessWebhookInput = {
  provider: string;
  providerEventId: string;
  providerRef: string;
  status: 'SUCCEEDED' | 'FAILED';
  signatureValid: boolean;
  payload?: Record<string, unknown>;
  correlationId: string;
};

@Injectable()
export class PaymentsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findReservationForPayment(reservationId: string) {
    return this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        userId: true,
        status: true,
        expiresAt: true,
        eventId: true,
        event: {
          select: {
            currency: true,
          },
        },
        items: {
          select: {
            quantity: true,
            priceCents: true,
            feesCents: true,
          },
        },
      },
    });
  }

  findPaymentByProviderRef(provider: string, providerRef: string) {
    return this.prisma.payment.findUnique({
      where: {
        provider_providerRef: {
          provider,
          providerRef,
        },
      },
      select: {
        id: true,
        reservationId: true,
        provider: true,
        providerRef: true,
        status: true,
        amountCents: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createPendingPayment(input: CreatePendingPaymentInput) {
    try {
      return await this.prisma.payment.create({
        data: {
          reservationId: input.reservationId,
          provider: input.provider,
          providerRef: input.providerRef,
          status: 'PENDING',
          amountCents: input.amountCents,
          currency: input.currency,
        } as never,
        select: {
          id: true,
          reservationId: true,
          provider: true,
          providerRef: true,
          status: true,
          amountCents: true,
          currency: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      const e = error as { code?: string };
      if (e?.code === 'P2002') {
        const existing = await this.findPaymentByProviderRef(
          input.provider,
          input.providerRef,
        );
        if (existing) return existing;
      }
      this.mapPersistenceError(error);
    }
  }

  async processWebhook(input: ProcessWebhookInput) {
    return this.withTransaction(async (tx) => {
      const now = new Date();

      let webhookEvent:
        | {
            id: string;
            paymentId: string | null;
            status: string;
          }
        | null = null;

      try {
        webhookEvent = await tx.paymentWebhookEvent.create({
          data: {
            provider: input.provider,
            providerEventId: input.providerEventId,
            status: input.signatureValid ? 'VERIFIED' : 'RECEIVED',
            signatureValid: input.signatureValid,
            payload: (input.payload ?? {}) as never,
          } as never,
          select: {
            id: true,
            paymentId: true,
            status: true,
          },
        });
      } catch (error) {
        const e = error as { code?: string };
        if (e?.code === 'P2002') {
          const existing = await tx.paymentWebhookEvent.findUnique({
            where: {
              provider_providerEventId: {
                provider: input.provider,
                providerEventId: input.providerEventId,
              },
            },
            select: {
              id: true,
              paymentId: true,
              status: true,
            },
          });
          return {
            duplicate: true,
            processed: existing?.status === 'PROCESSED',
            paymentId: existing?.paymentId ?? null,
            status: existing?.status ?? null,
          };
        }
        throw error;
      }

      const payment = await tx.payment.findUnique({
        where: {
          provider_providerRef: {
            provider: input.provider,
            providerRef: input.providerRef,
          },
        },
        select: {
          id: true,
          reservationId: true,
          status: true,
          provider: true,
          providerRef: true,
        },
      });

      if (!payment) {
        await tx.paymentWebhookEvent.update({
          where: { id: webhookEvent.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Payment not found for provider reference.',
            processedAt: now,
          } as never,
        });
        throw new NotFoundException('Payment not found for webhook event.');
      }

      let outboxTopic: 'payment.succeeded' | 'payment.failed' | null = null;
      let nextStatus: 'SUCCEEDED' | 'FAILED' | null = null;

      if (input.status === 'SUCCEEDED' && payment.status !== 'SUCCEEDED') {
        nextStatus = 'SUCCEEDED';
        outboxTopic = 'payment.succeeded';
      }

      if (input.status === 'FAILED' && payment.status !== 'FAILED') {
        // Do not downgrade a terminal success.
        if (payment.status !== 'SUCCEEDED') {
          nextStatus = 'FAILED';
          outboxTopic = 'payment.failed';
        }
      }

      if (nextStatus) {
        await tx.payment.update({
          where: { id: payment.id },
          data:
            nextStatus === 'SUCCEEDED'
              ? ({
                  status: 'SUCCEEDED',
                  succeededAt: now,
                } as never)
              : ({
                  status: 'FAILED',
                  failedAt: now,
                } as never),
        });
      }

      if (outboxTopic) {
        await tx.outboxEvent.create({
          data: {
            topic: outboxTopic,
            key: payment.id,
            payload: {
              eventId: randomUUID(),
              occurredAt: now.toISOString(),
              version: 1,
              correlationId: input.correlationId,
              actor: 'system',
              data: {
                paymentId: payment.id,
                reservationId: payment.reservationId,
                provider: payment.provider,
                providerRef: payment.providerRef,
                status: nextStatus,
              },
            } as never,
            status: 'PENDING',
            correlationId: input.correlationId,
            actorUserId: null,
          },
        });
      }

      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          paymentId: payment.id,
          status: 'PROCESSED',
          processedAt: now,
        } as never,
      });

      return {
        duplicate: false,
        processed: true,
        paymentId: payment.id,
        status: nextStatus ?? payment.status,
      };
    });
  }
}
