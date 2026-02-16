import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { IamController } from './iam.controller';
import { IamService } from './iam.service';
import { UsersRepository } from './users.repository';
import { BcryptPasswordHasher } from './provider/password/bcrypt-password-hasher.provider';
import { JwtTokenProvider } from './provider/token/jwt-token.provider';
import {
  ACL_PROVIDER,
  AUTHORIZATION_PROVIDER,
  PASSWORD_HASHER,
  ROLE_ASSIGNMENT_PROVIDER,
  TOKEN_SERVICE,
} from './provider/token/tokens';
import { PrismaModule } from '@/infra/prisma/prisma.module';
import { PrismaAuthorizationProvider } from './provider/authorization/prisma-authorization.provider';
import { PrismaRoleAssignmentProvider } from './provider/authorization/prisma-role-assignment.provider';
import {
  EventManagePolicyProvider,
  OrgMemberManagePolicyProvider,
  ReservationReadPolicyProvider,
  TicketReadPolicyProvider,
} from './provider/authorization/acl-policies.provider';
import {
  EVENT_MANAGE_POLICY,
  ORG_MEMBER_MANAGE_POLICY,
  RESERVATION_READ_POLICY,
  TICKET_READ_POLICY,
} from './provider/authorization/policy-tokens';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [IamController],
  providers: [
    IamService,
    UsersRepository,
    PrismaAuthorizationProvider,
    PrismaRoleAssignmentProvider,
    OrgMemberManagePolicyProvider,
    EventManagePolicyProvider,
    ReservationReadPolicyProvider,
    TicketReadPolicyProvider,
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE,
      useClass: JwtTokenProvider,
    },
    {
      provide: AUTHORIZATION_PROVIDER,
      useExisting: PrismaAuthorizationProvider,
    },
    {
      provide: ACL_PROVIDER,
      useExisting: PrismaAuthorizationProvider,
    },
    {
      provide: ROLE_ASSIGNMENT_PROVIDER,
      useExisting: PrismaRoleAssignmentProvider,
    },
    {
      provide: ORG_MEMBER_MANAGE_POLICY,
      useExisting: OrgMemberManagePolicyProvider,
    },
    {
      provide: EVENT_MANAGE_POLICY,
      useExisting: EventManagePolicyProvider,
    },
    {
      provide: RESERVATION_READ_POLICY,
      useExisting: ReservationReadPolicyProvider,
    },
    {
      provide: TICKET_READ_POLICY,
      useExisting: TicketReadPolicyProvider,
    },
  ],
  exports: [
    AUTHORIZATION_PROVIDER,
    ACL_PROVIDER,
    ROLE_ASSIGNMENT_PROVIDER,
    ORG_MEMBER_MANAGE_POLICY,
    EVENT_MANAGE_POLICY,
    RESERVATION_READ_POLICY,
    TICKET_READ_POLICY,
  ],
})
export class IamModule {}
