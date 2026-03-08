import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { buildLogContext } from '@/common/utils/log-context';
import { MetricsProvider } from '@/common/providers/metrics.provider';
import { BookingsService } from '@/modules/bookings/bookings.service';
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
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(PAYMENT_PROVIDER_REGISTRY)
    private readonly paymentProviders: PaymentProviderRegistry,
    private readonly metricsProvider: MetricsProvider,
  ) {}

  async createPayment(
    userId: string,
    tenantOrgId: string,
    dto: CreatePaymentDto,
    correlationId?: string,
  ) {
    const startTime = Date.now();
    try {
      const requestedBookingId = dto.bookingId ?? dto.reservationId;
      if (!requestedBookingId) {
        throw new BadRequestException('bookingId is required.');
      }

      const booking =
        await this.bookingsService.getPaymentTarget(requestedBookingId);
      if (!booking) {
        throw new BadRequestException('Booking not found.');
      }

      if (booking.userId !== userId) {
        throw new ForbiddenException('You can only pay for your own booking.');
      }

      if (
        (booking.domainType === 'event' || booking.domainType === 'rail') &&
        booking.orgId !== tenantOrgId
      ) {
        throw new ForbiddenException(
          'Booking does not belong to the resolved tenant.',
        );
      }

      const now = new Date();
      if (
        booking.status !== 'HOLD' ||
        !booking.holdExpiresAt ||
        booking.holdExpiresAt <= now
      ) {
        throw new BadRequestException(
          'Payment cannot be created for expired or inactive booking.',
        );
      }

      const expectedAmountCents = booking.items.reduce(
        (total, item) =>
          total + item.quantity * (item.unitPriceCents + item.feesCents),
        0,
      );

      if (dto.amountCents !== expectedAmountCents) {
        throw new BadRequestException(
          `Invalid payment amount. Expected ${expectedAmountCents} cents for this booking.`,
        );
      }

      const bookingCurrency = booking.currency.toUpperCase();
      if (dto.currency !== bookingCurrency) {
        throw new BadRequestException(
          `Invalid payment currency. Expected ${bookingCurrency}.`,
        );
      }

      const provider = this.getPaymentProvider(dto.provider);
      const paymentIntent = await provider.createPaymentIntent({
        bookingId: booking.id,
        amountCents: dto.amountCents,
        currency: dto.currency,
        providerRef: dto.providerRef,
      });

      const payment = await this.paymentsRepository.createPendingPayment({
        bookingId: booking.id,
        domainType: booking.domainType,
        reservationId: booking.legacyReservationId,
        provider: paymentIntent.provider,
        providerRef: paymentIntent.providerRef,
        amountCents: dto.amountCents,
        currency: dto.currency,
      });

      if (payment.bookingId !== booking.id) {
        throw new BadRequestException(
          'providerRef already belongs to another payment record.',
        );
      }

      this.logger.log(
        'Payment intent created',
        buildLogContext({
          module: 'payments',
          action: 'create',
          correlationId,
          userId,
          bookingId: booking.id,
          paymentId: payment.id,
          provider: payment.provider,
          meta: {
            reservationId: booking.legacyReservationId,
            amountCents: payment.amountCents,
            currency: payment.currency,
          },
        }),
      );
      this.metricsProvider.incrementCounter(
        'payment_create_success_total',
        'Count of successful payment intent creations',
      );
      this.metricsProvider.observeHistogram(
        'payment_create_duration_seconds',
        'Duration of payment creation in seconds',
        (Date.now() - startTime) / 1000,
      );

      return payment;
    } catch (error) {
      this.metricsProvider.incrementCounter(
        'payment_create_failure_total',
        'Count of failed payment creations',
      );
      this.metricsProvider.observeHistogram(
        'payment_create_duration_seconds',
        'Duration of payment creation in seconds',
        (Date.now() - startTime) / 1000,
      );
      throw error;
    }
  }

  async processWebhook(
    dto: PaymentWebhookDto,
    signature?: string,
    correlationId?: string,
  ) {
    const startTime = Date.now();
    try {
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

      const effectiveCorrelationId = correlationId ?? randomUUID();
      const result = await this.paymentsRepository.processWebhook({
        provider: dto.provider,
        providerEventId: dto.providerEventId,
        providerRef: dto.providerRef,
        status: dto.status,
        signatureValid,
        payload: dto.payload,
        correlationId: effectiveCorrelationId,
      });

      this.logger.log(
        'Payment webhook processed',
        buildLogContext({
          module: 'payments',
          action: 'webhook.process',
          correlationId: effectiveCorrelationId,
          paymentId: result.paymentId ?? undefined,
          provider: dto.provider,
          providerEventId: dto.providerEventId,
          meta: {
            status: dto.status,
            signatureValid,
            duplicate: result.duplicate,
            processed: result.processed,
          },
        }),
      );
      this.metricsProvider.incrementCounter(
        'payment_webhook_processed_total',
        'Count of successfully processed payment webhooks',
        1,
        { provider: dto.provider, status: dto.status.toLowerCase() },
      );
      this.metricsProvider.observeHistogram(
        'payment_webhook_duration_seconds',
        'Duration of payment webhook processing in seconds',
        (Date.now() - startTime) / 1000,
        { provider: dto.provider },
      );

      return result;
    } catch (error) {
      this.metricsProvider.incrementCounter(
        'payment_webhook_failed_total',
        'Count of failed payment webhook processing attempts',
        1,
        { provider: dto.provider },
      );
      this.metricsProvider.observeHistogram(
        'payment_webhook_duration_seconds',
        'Duration of payment webhook processing in seconds',
        (Date.now() - startTime) / 1000,
        { provider: dto.provider },
      );
      throw error;
    }
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
