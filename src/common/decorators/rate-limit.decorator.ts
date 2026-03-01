import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rate_limit_config';

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
  keyPrefix?: string;
};

export const RateLimit = (config: RateLimitConfig) =>
  SetMetadata(RATE_LIMIT_KEY, config);
