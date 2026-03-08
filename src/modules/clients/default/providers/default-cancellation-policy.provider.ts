import { Injectable } from '@nestjs/common';
import type {
  CancellationPolicyContract,
  CancellationRules,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class DefaultCancellationPolicyProvider
  implements CancellationPolicyContract
{
  getPolicy(): CancellationRules {
    return {
      allowHoldCancellation: true,
      allowConfirmedCancellation: false,
      refundMode: 'manual_review',
    };
  }
}
