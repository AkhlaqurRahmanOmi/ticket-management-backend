import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { RoleAssignmentProvider } from './role-assignment.provider.contract';

@Injectable()
export class PrismaRoleAssignmentProvider implements RoleAssignmentProvider {
  constructor(private readonly prisma: PrismaService) {}

  async assignRoleByName(userId: string, roleName: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "UserRole"(user_id, role_id, assigned_at)
      SELECT ${userId}::uuid, r.id, NOW()
      FROM "Role" r
      WHERE r.name = ${roleName}
      ON CONFLICT (user_id, role_id) DO NOTHING
    `;
  }
}
