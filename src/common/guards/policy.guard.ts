import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  POLICIES_KEY,
  type PolicyDefinition,
  type PolicyHandler,
} from '@/common/decorators/check-policies.decorator';

@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policies = this.reflector.getAllAndOverride<PolicyDefinition[]>(
      POLICIES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!policies || policies.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    for (const policy of policies) {
      const allowed = await this.evaluatePolicy(policy, { user, request });
      if (!allowed) {
        throw new ForbiddenException('Policy check failed.');
      }
    }

    return true;
  }

  private async evaluatePolicy(
    policy: PolicyDefinition,
    context: { user: NonNullable<Request['user']>; request: Request },
  ): Promise<boolean> {
    if (typeof policy === 'function') {
      return policy(context);
    }

    const resolvedPolicy =
      typeof policy === 'string' || typeof policy === 'symbol'
        ? this.moduleRef.get<PolicyHandler>(policy as never, { strict: false })
        : policy;

    if (
      !resolvedPolicy ||
      typeof (resolvedPolicy as PolicyHandler).handle !== 'function'
    ) {
      throw new InternalServerErrorException(
        'Invalid policy configuration for route.',
      );
    }

    return resolvedPolicy.handle(context);
  }
}
