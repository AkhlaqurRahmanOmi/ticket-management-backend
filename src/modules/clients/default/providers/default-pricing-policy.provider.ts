import { Injectable } from '@nestjs/common';
import type {
  PriceBreakdown,
  PriceBreakdownInput,
  PricingPolicy,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class DefaultPricingPolicyProvider implements PricingPolicy {
  buildPriceBreakdown(input: PriceBreakdownInput): PriceBreakdown {
    const baseAmountCents = Math.max(0, input.baseAmountCents);

    return {
      baseAmountCents,
      serviceFeeCents: 0,
      taxCents: 0,
      totalAmountCents: baseAmountCents,
      currency: input.currency ?? 'USD',
    };
  }
}
