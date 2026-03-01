import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RateLimitGuard } from '@/common/guards/rate-limit.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
  @Roles('USER')
  @RateLimit({ limit: 10, windowSeconds: 60, keyPrefix: 'payments:create' })
  createPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
    @Req() request: Request,
  ) {
    return this.paymentsService.createPayment(userId, dto, request.requestId);
  }

  @Post('webhook')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 120, windowSeconds: 60, keyPrefix: 'payments:webhook' })
  processWebhook(
    @Body() dto: PaymentWebhookDto,
    @Headers('x-webhook-signature') signature?: string,
    @Req() request?: Request,
  ) {
    return this.paymentsService.processWebhook(dto, signature, request?.requestId);
  }
}
