import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  TENANT_ACCESS_KEY,
  type TenantAccessOptions,
} from '@/common/decorators/tenant-access.decorator';
import { DomainRuntimeService } from '@/modules/domain-runtime/domain-runtime.service';
import { TenantRuntimeService } from '@/modules/tenant-runtime/tenant-runtime.service';
import { TenantSubscriptionsService } from '@/modules/tenant-subscriptions/tenant-subscriptions.service';

@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantRuntimeService: TenantRuntimeService,
    private readonly tenantSubscriptionsService: TenantSubscriptionsService,
    private readonly domainRuntimeService: DomainRuntimeService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      Required<TenantAccessOptions> | undefined
    >(TENANT_ACCESS_KEY, [context.getHandler(), context.getClass()]);

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantContext =
      this.tenantRuntimeService.getRequestTenantContext(request);

    if (tenantContext.status === 'conflict') {
      throw new BadRequestException(
        'Conflicting tenant signals were provided in the request.',
      );
    }

    if (options.requireResolvedTenant && tenantContext.status !== 'resolved') {
      throw new BadRequestException(
        'Tenant context is required for this route.',
      );
    }

    if (!options.requireActiveDomainSubscription) {
      return true;
    }

    if (tenantContext.status !== 'resolved' || !tenantContext.orgId) {
      throw new BadRequestException(
        'Tenant context is required for domain subscription checks.',
      );
    }

    if (request.user?.roles?.includes('SUPER_ADMIN')) {
      return true;
    }

    const hasActiveSubscription =
      await this.tenantSubscriptionsService.isDomainEnabled(
        tenantContext.orgId,
        this.domainRuntimeService.getActiveDomain(),
      );

    if (!hasActiveSubscription) {
      throw new ForbiddenException(
        'Tenant is not subscribed to the active domain.',
      );
    }

    return true;
  }
}
