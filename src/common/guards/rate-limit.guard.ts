import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  RATE_LIMIT_KEY,
  RateLimitConfig,
} from '@/common/decorators/rate-limit.decorator';
import { RedisService } from '@/infra/redis/redis/redis.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!config) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const identity = this.getIdentity(request);
    const routeKey = request.route?.path ?? request.path;
    const keyPrefix = config.keyPrefix ?? 'api';
    const redisKey = `rl:${keyPrefix}:${request.method}:${routeKey}:${identity}`;

    const { count, ttlSeconds } = await this.redisService.incrementWithWindow(
      redisKey,
      config.windowSeconds,
    );

    response.setHeader('x-ratelimit-limit', String(config.limit));
    response.setHeader('x-ratelimit-remaining', String(Math.max(0, config.limit - count)));
    response.setHeader('x-ratelimit-reset', String(ttlSeconds));

    if (count > config.limit) {
      response.setHeader('retry-after', String(ttlSeconds));
      throw new HttpException(
        `Rate limit exceeded. Try again in ${ttlSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private getIdentity(request: Request): string {
    const user = request.user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    const xff = request.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return `ip:${xff.split(',')[0].trim()}`;
    }

    return `ip:${request.ip ?? 'unknown'}`;
  }
}
