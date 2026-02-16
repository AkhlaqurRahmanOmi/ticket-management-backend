import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class AddOrgMemberDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  role!: string;
}
