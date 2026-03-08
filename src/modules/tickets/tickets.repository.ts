import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

@Injectable()
export class TicketsRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  findTicketById(ticketId: string) {
    return this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        code: true,
        status: true,
        issuedAt: true,
        eventId: true,
        orderId: true,
        userId: true,
        eventSeatId: true,
        ticketTypeId: true,
      },
    });
  }

  findTicketsByUserIdAndOrgId(userId: string, tenantOrgId: string) {
    return this.prisma.ticket.findMany({
      where: {
        userId,
        event: {
          orgId: tenantOrgId,
        },
      },
      select: {
        id: true,
        code: true,
        status: true,
        issuedAt: true,
        eventId: true,
        orderId: true,
        eventSeatId: true,
        ticketTypeId: true,
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });
  }
}
