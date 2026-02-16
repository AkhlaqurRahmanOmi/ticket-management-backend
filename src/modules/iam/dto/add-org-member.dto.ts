import { OrgRole } from '@/generated/prisma/enums';
import { IsEnum, IsUUID } from 'class-validator';

export class AddOrgMemberDto {
  @IsUUID()
  userId!: string;

  @IsEnum(OrgRole)
  role!: OrgRole;
}
