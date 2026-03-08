import { Injectable } from '@nestjs/common';
import type {
  NotificationPolicyContract,
  NotificationPreferences,
} from '@/modules/client-runtime/interfaces/client-policy.interface';

@Injectable()
export class DefaultNotificationPolicyProvider
  implements NotificationPolicyContract
{
  getPreferences(): NotificationPreferences {
    return {
      bookingCreated: true,
      paymentSucceeded: true,
      ticketIssued: true,
      cancellationConfirmed: true,
    };
  }
}
