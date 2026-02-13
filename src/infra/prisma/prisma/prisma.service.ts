import { Injectable } from '@nestjs/common';

@Injectable()
export class PrismaService {
  async $transaction<T>(
    callback: (tx: PrismaService) => Promise<T>,
    _options?: unknown,
  ): Promise<T> {
    return callback(this);
  }
}
