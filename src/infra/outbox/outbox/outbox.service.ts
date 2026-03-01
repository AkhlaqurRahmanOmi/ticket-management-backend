import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infra/prisma/prisma/prisma.service';

type ClaimedOutboxEvent = {
  id: string;
  topic: string;
  key: string;
  payload: Record<string, unknown>;
  headers: Record<string, string> | null;
  correlationId: string | null;
  actorUserId: string | null;
  attempts: number;
};

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(
    topic: string,
    key: string,
    payload: Record<string, unknown>,
    actorUserId?: string,
    options?: {
      correlationId?: string | null;
      headers?: Record<string, unknown> | null;
      availableAt?: Date;
    },
  ) {
    return this.prisma.outboxEvent.create({
      data: {
        topic,
        key,
        payload: payload as Prisma.InputJsonValue,
        headers: (options?.headers ?? null) as Prisma.InputJsonValue,
        status: 'PENDING',
        availableAt: options?.availableAt ?? new Date(),
        correlationId: options?.correlationId ?? null,
        actorUserId: actorUserId ?? null,
      },
    });
  }

  async claimPendingBatch(
    limit: number,
    leaseSeconds = 30,
  ): Promise<ClaimedOutboxEvent[]> {
    const safeLimit = Math.max(1, Math.min(500, limit));
    const safeLeaseSeconds = Math.max(5, Math.min(300, leaseSeconds));

    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      topic: string;
      key: string;
      payload: unknown;
      headers: unknown;
      correlationId: string | null;
      actorUserId: string | null;
      attempts: number;
    }>>`
      WITH picked AS (
        SELECT id
        FROM "OutboxEvent"
        WHERE status = 'PENDING'
          AND "availableAt" <= NOW()
        ORDER BY "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${safeLimit}
      )
      UPDATE "OutboxEvent" oe
      SET attempts = oe.attempts + 1,
          "availableAt" = NOW() + (${safeLeaseSeconds} * INTERVAL '1 second')
      FROM picked
      WHERE oe.id = picked.id
      RETURNING
        oe.id,
        oe.topic,
        oe.key,
        oe.payload,
        oe.headers,
        oe."correlationId" AS "correlationId",
        oe."actorUserId" AS "actorUserId",
        oe.attempts
    `;

    return rows.map((row) => ({
      id: row.id,
      topic: row.topic,
      key: row.key,
      payload: this.normalizePayload(row.payload),
      headers: this.normalizeHeaders(row.headers),
      correlationId: row.correlationId,
      actorUserId: row.actorUserId,
      attempts: row.attempts,
    }));
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        lastError: null,
      },
    });
  }

  async markPublishFailure(
    id: string,
    attempt: number,
    maxAttempts: number,
    errorMessage: string,
    nextAvailableAt: Date,
  ): Promise<void> {
    const terminal = attempt >= maxAttempts;

    await this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: terminal ? 'FAILED' : 'PENDING',
        lastError: this.truncateError(errorMessage),
        availableAt: terminal ? new Date() : nextAvailableAt,
      },
    });
  }

  private normalizePayload(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    return {
      raw: value,
    };
  }

  private normalizeHeaders(value: unknown): Record<string, string> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, String(v)]);

    if (entries.length === 0) {
      return null;
    }

    return Object.fromEntries(entries);
  }

  private truncateError(message: string): string {
    return message.length > 1000 ? message.slice(0, 1000) : message;
  }
}
