import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(
    topic: string,
    key: string,
    payload: Record<string, unknown>,
    actorUserId?: string,
  ) {
    return this.prisma.outboxEvent.create({
      data: {
        topic,
        key,
        payload: payload as Prisma.InputJsonValue,
        status: 'PENDING',
        correlationId: null,
        actorUserId: actorUserId ?? null,
      },
    });
  }
}
