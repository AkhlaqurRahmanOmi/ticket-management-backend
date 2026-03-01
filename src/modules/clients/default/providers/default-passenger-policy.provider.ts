import { Injectable } from '@nestjs/common';

export type DefaultPassengerRequirements = {
  passengerRequired: boolean;
  requiredFields: string[];
  allowGuestPassengerRecords: boolean;
};

@Injectable()
export class DefaultPassengerPolicyProvider {
  getRequirements(): DefaultPassengerRequirements {
    return {
      passengerRequired: false,
      requiredFields: [],
      allowGuestPassengerRecords: true,
    };
  }
}
