import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type {
  PaymentProvider,
  PaymentProviderRegistry,
} from './interface/payment-provider.interface';
import { PAYMENT_PROVIDER_REGISTRY } from './token/payments.tokens';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsRepository } from './payments.repository';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(PAYMENT_PROVIDER_REGISTRY)
    private readonly paymentProviders: PaymentProviderRegistry,
  ) {}

  async createPayment(userId: string, dto: CreatePaymentDto) {
    const reservation = await this.paymentsRepository.findReservationForPayment(
      dto.reservationId,
    );
    if (!reservation) {
      throw new BadRequestException('Reservation not found.');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('You can only pay for your own reservation.');
    }

    const now = new Date();
    if (reservation.status !== 'ACTIVE' || reservation.expiresAt <= now) {
      throw new BadRequestException(
        'Payment cannot be created for expired or inactive reservation.',
      );
    }

    const expectedAmountCents = reservation.items.reduce(
      (total, item) => total + item.quantity * (item.priceCents + item.feesCents),
      0,
    );

    if (dto.amountCents !== expectedAmountCents) {
      throw new BadRequestException(
        `Invalid payment amount. Expected ${expectedAmountCents} cents for this reservation.`,
      );
    }

    const reservationCurrency = reservation.event?.currency?.toUpperCase();
    if (reservationCurrency && dto.currency !== reservationCurrency) {
      throw new BadRequestException(
        `Invalid payment currency. Expected ${reservationCurrency}.`,
      );
    }

    const provider = this.getPaymentProvider(dto.provider);
    const paymentIntent = await provider.createPaymentIntent({
      reservationId: reservation.id,
      amountCents: dto.amountCents,
      currency: dto.currency,
      providerRef: dto.providerRef,
    });

    const payment = await this.paymentsRepository.createPendingPayment({
      reservationId: reservation.id,
      provider: paymentIntent.provider,
      providerRef: paymentIntent.providerRef,
      amountCents: dto.amountCents,
      currency: dto.currency,
    });

    if (payment.reservationId !== reservation.id) {
      throw new BadRequestException(
        'providerRef already belongs to another payment record.',
      );
    }

    return payment;
  }

  async processWebhook(dto: PaymentWebhookDto, signature?: string) {
    const provider = this.getPaymentProvider(dto.provider);
    const signatureValid = await provider.verifyWebhookSignature({
      providerEventId: dto.providerEventId,
      providerRef: dto.providerRef,
      status: dto.status,
      payload: dto.payload,
      signature,
    });
    if (provider.supportsSignatureVerification() && !signatureValid) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    return this.paymentsRepository.processWebhook({
      provider: dto.provider,
      providerEventId: dto.providerEventId,
      providerRef: dto.providerRef,
      status: dto.status,
      signatureValid,
      payload: dto.payload,
      correlationId: randomUUID(),
    });
  }

  private getPaymentProvider(providerName?: string): PaymentProvider {
    const normalizedProvider = (providerName ?? 'manual').trim().toLowerCase();
    const provider = this.paymentProviders.get(normalizedProvider);
    if (!provider) {
      throw new BadRequestException(
        `Unsupported payment provider "${normalizedProvider}".`,
      );
    }

    return provider;
  }
}
