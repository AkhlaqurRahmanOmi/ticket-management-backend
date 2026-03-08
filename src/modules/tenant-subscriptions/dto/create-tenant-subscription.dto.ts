import { Transform } from 'class-transformer';
import { IsIn, IsString } from 'class-validator';
import {
  BOOKING_DOMAINS,
  type BookingDomain,
} from '@/modules/domain-runtime/domain.types';

export class CreateTenantSubscriptionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsIn(BOOKING_DOMAINS)
  domain!: BookingDomain;
}
