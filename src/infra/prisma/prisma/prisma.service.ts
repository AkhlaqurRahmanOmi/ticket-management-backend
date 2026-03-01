import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.getOrThrow<string>('DATABASE_URL');
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    const pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    const logLevels: Prisma.LogLevel[] =
      nodeEnv === 'production' ? ['warn', 'error'] : ['warn', 'error'];

    super({
      adapter,
      log: logLevels,
      errorFormat: nodeEnv === 'production' ? 'minimal' : 'pretty',
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      await this.pool.end();
      this.logger.log('Disconnected from PostgreSQL database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', error);
    }
  }

  async enableShutdownHooks(app: any): Promise<void> {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }

  async isHealthy(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
