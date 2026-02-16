import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import {
  AuthorizationProvider,
  UserAuthorizationContext,
} from './authorization-provider.contract';
import { AclProvider } from './acl-provider.contract';

@Injectable()
export class PrismaAuthorizationProvider
  implements AuthorizationProvider, AclProvider
{
  constructor(private readonly prisma: PrismaService) {}

  async getUserAuthorizationContext(
    userId: string,
  ): Promise<UserAuthorizationContext> {
    const roleRows = await this.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT r.name
      FROM "UserRole" ur
      JOIN "Role" r ON r.id = ur.role_id
      WHERE ur.user_id = ${userId}::uuid
    `;

    const permissionRows = await this.prisma.$queryRaw<Array<{ name: string }>>`
      SELECT DISTINCT p.name
      FROM "UserRole" ur
      JOIN "RolePermission" rp ON rp.role_id = ur.role_id
      JOIN "Permission" p ON p.id = rp.permission_id
      WHERE ur.user_id = ${userId}::uuid
    `;

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      select: {
        orgId: true,
        role: true,
      },
    });

    return {
      roles: roleRows.map((row) => row.name),
      permissions: permissionRows.map((row) => row.name),
      memberships: memberships.map((membership) => ({
        orgId: membership.orgId,
        role: membership.role,
      })),
    };
  }

  async isOrganizationMember(userId: string, orgId: string): Promise<boolean> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId,
        },
      },
      select: { id: true },
    });

    return !!membership;
  }
}
