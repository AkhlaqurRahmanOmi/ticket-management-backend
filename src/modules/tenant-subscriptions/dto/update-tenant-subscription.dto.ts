import { Transform } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';
import {
  TENANT_SUBSCRIPTION_STATUSES,
  type TenantSubscriptionStatus,
} from '../types/tenant-subscription.types';

export class UpdateTenantSubscriptionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsIn(TENANT_SUBSCRIPTION_STATUSES)
  status!: TenantSubscriptionStatus;
}
