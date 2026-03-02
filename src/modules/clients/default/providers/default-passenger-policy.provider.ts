import { Injectable } from '@nestjs/common';
import type {
  PassengerPolicy,
  PassengerRequirements,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class DefaultPassengerPolicyProvider implements PassengerPolicy {
  getRequirements(): PassengerRequirements {
    return {
      passengerRequired: false,
      requiredFields: [],
      allowGuestPassengerRecords: true,
    };
  }
}
