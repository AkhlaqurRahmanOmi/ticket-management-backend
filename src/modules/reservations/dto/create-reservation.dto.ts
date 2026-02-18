import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateReservationDto {
  @IsUUID()
  eventId!: string;

  @IsUUID()
  eventSeatId!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;
}
