import { Injectable } from '@nestjs/common';

export type DefaultCancellationPolicy = {
  allowHoldCancellation: boolean;
  allowConfirmedCancellation: boolean;
  refundMode: 'none' | 'manual_review';
};

@Injectable()
export class DefaultCancellationPolicyProvider {
  getPolicy(): DefaultCancellationPolicy {
    return {
      allowHoldCancellation: true,
      allowConfirmedCancellation: false,
      refundMode: 'manual_review',
    };
  }
}
