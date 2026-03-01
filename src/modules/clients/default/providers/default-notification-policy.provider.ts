import { Injectable } from '@nestjs/common';

export type DefaultNotificationPreferences = {
  bookingCreated: boolean;
  paymentSucceeded: boolean;
  ticketIssued: boolean;
  cancellationConfirmed: boolean;
};

@Injectable()
export class DefaultNotificationPolicyProvider {
  getPreferences(): DefaultNotificationPreferences {
    return {
      bookingCreated: true,
      paymentSucceeded: true,
      ticketIssued: true,
      cancellationConfirmed: true,
    };
  }
}
