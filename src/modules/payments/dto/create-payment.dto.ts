import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePaymentDto {
  @ValidateIf((payload: CreatePaymentDto) => !payload.reservationId)
  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsUUID()
  reservationId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  provider?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  providerRef?: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(3)
  currency!: string;
}
