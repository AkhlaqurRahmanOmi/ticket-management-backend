import { Injectable, Logger } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import * as crypto from 'crypto';
import { PrismaService } from './prisma/prisma.service';

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?:
    | 'ReadUncommitted'
    | 'ReadCommitted'
    | 'RepeatableRead'
    | 'Serializable';
}

type TransactionClient = Omit<
  PrismaService,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

type PrismaErrorLike = {
  code?: string;
  message?: string;
};

@Injectable()
export class UnitOfWorkService {
  private readonly logger = new Logger(UnitOfWorkService.name);

  constructor(private readonly prisma: PrismaService) {}

  async transaction<T>(
    callback: (prisma: TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    const transactionId = this.generateTransactionId();

    this.logger.debug(
      `Transaction started id=${transactionId} options=${JSON.stringify(
        options ?? {},
      )}`,
    );

    const startTime = performance.now();

    try {
      const result = await this.prisma.$transaction(
        async (tx) => callback(tx as TransactionClient),
        options,
      );

      const executionTime = (performance.now() - startTime).toFixed(2);
      this.logger.debug(
        `Transaction committed id=${transactionId} executionTime=${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = (performance.now() - startTime).toFixed(2);
      const err = error as PrismaErrorLike;

      this.logger.error(
        `Transaction failed id=${transactionId} executionTime=${executionTime}ms code=${
          err.code ?? 'UNKNOWN'
        } message=${err.message ?? 'Unknown error'}`,
      );

      throw error;
    }
  }

  async executeWithRetry<T>(
    callback: (prisma: TransactionClient) => Promise<T>,
    maxRetries = 3,
    options?: TransactionOptions,
  ): Promise<T> {
    const transactionId = this.generateTransactionId();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.transaction(callback, options);
      } catch (error) {
        const err = error as PrismaErrorLike;
        const isRetryable = this.isRetryableError(err);
        const isLastAttempt = attempt === maxRetries;

        if (isLastAttempt || !isRetryable) {
          this.logger.error(
            `Transaction failed after retries id=${transactionId} attempt=${attempt}/${maxRetries} retryable=${isRetryable} code=${
              err.code ?? 'UNKNOWN'
            } message=${err.message ?? 'Unknown error'}`,
          );
          throw error;
        }

        const delayMs = this.calculateBackoff(attempt);

        this.logger.warn(
          `Transaction retry scheduled id=${transactionId} attempt=${attempt}/${maxRetries} delayMs=${delayMs}`,
        );

        await this.delay(delayMs);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private isRetryableError(error: PrismaErrorLike): boolean {
    if (!error.code) return false;

    const retryableCodes = [
      'P2034',
      'P2024',
      'P1008',
      'P1001',
      'P1002',
      'P1017',
    ];

    const message = error.message ?? '';
    const isDeadlock =
      message.includes('deadlock') || message.includes('Deadlock');

    return retryableCodes.includes(error.code) || isDeadlock;
  }

  private calculateBackoff(attempt: number): number {
    const exponentialDelay = Math.min(2000, Math.pow(2, attempt) * 100);
    const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);

    return Math.floor(exponentialDelay + jitter);
  }

  private generateTransactionId(): string {
    return `txn_${crypto.randomBytes(8).toString('hex')}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
