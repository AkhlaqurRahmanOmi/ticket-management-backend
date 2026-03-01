import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@/common/repositories/base.repository';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';
import { UnitOfWorkService } from '@/infra/prisma/unit-of-work.service';

@Injectable()
export class RealtimeRepository extends BaseRepository {
  constructor(
    prisma: PrismaService,
    unitOfWork: UnitOfWorkService,
  ) {
    super(prisma, unitOfWork);
  }

  async getEventSeatSnapshot(eventId: string) {
    const seats = await this.prisma.eventSeat.findMany({
      where: { eventId },
      select: {
        id: true,
        status: true,
        reservedUntil: true,
        venueSeat: {
          select: {
            seatNumber: true,
            code: true,
          },
        },
      },
      orderBy: {
        venueSeat: {
          seatNumber: 'asc',
        },
      },
    });

    return seats.map((seat) => ({
      id: seat.id,
      seatNo: seat.venueSeat.seatNumber,
      seatCode: seat.venueSeat.code,
      status: seat.status,
      reservedUntil: seat.reservedUntil,
    }));
  }
}
