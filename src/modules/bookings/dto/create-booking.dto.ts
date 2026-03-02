import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  BOOKING_DOMAINS,
  type BookingDomain,
} from '@/modules/domain-runtime/domain.types';

export class CreateBookingDto {
  @IsIn(BOOKING_DOMAINS)
  domainType!: BookingDomain;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  inventoryUnitIds!: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;
}
