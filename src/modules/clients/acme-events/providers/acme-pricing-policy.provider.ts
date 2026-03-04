import { Injectable } from '@nestjs/common';
import type {
  PriceBreakdown,
  PriceBreakdownInput,
  PricingPolicy,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class AcmePricingPolicyProvider implements PricingPolicy {
  buildPriceBreakdown(input: PriceBreakdownInput): PriceBreakdown {
    const baseAmountCents = Math.max(0, input.baseAmountCents);
    const serviceFeeCents = Math.ceil(baseAmountCents * 0.05);
    const taxCents = 0;

    return {
      baseAmountCents,
      serviceFeeCents,
      taxCents,
      totalAmountCents: baseAmountCents + serviceFeeCents + taxCents,
      currency: input.currency ?? 'USD',
    };
  }
}
