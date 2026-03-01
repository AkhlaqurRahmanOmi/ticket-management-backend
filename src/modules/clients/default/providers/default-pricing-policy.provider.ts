import { Injectable } from '@nestjs/common';

export type DefaultPriceBreakdownInput = {
  baseAmountCents: number;
  currency?: string;
};

export type DefaultPriceBreakdown = {
  baseAmountCents: number;
  serviceFeeCents: number;
  taxCents: number;
  totalAmountCents: number;
  currency: string;
};

@Injectable()
export class DefaultPricingPolicyProvider {
  buildPriceBreakdown(
    input: DefaultPriceBreakdownInput,
  ): DefaultPriceBreakdown {
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
