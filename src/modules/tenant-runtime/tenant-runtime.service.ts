import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { HEADER_TENANT_SLUG } from '@/common/constants/headers';
import { TenantLookupRepository } from './repositories/tenant-lookup.repository';
import type {
  TenantCandidate,
  TenantIdentity,
  TenantRequestContext,
} from './types/tenant-context.types';

@Injectable()
export class TenantRuntimeService {
  constructor(
    private readonly tenantLookupRepository: TenantLookupRepository,
  ) {}

  async resolveRequestTenantContext(
    request: Request,
  ): Promise<TenantRequestContext> {
    const existingContext = request.tenantContext;
    if (existingContext && existingContext.status !== 'unresolved') {
      return existingContext;
    }

    const candidates = this.collectTenantCandidates(request);
    const resolvedContext = await this.buildTenantContext(candidates);
    request.tenantContext = resolvedContext;

    return resolvedContext;
  }

  getRequestTenantContext(request: Request): TenantRequestContext {
    return (
      request.tenantContext ?? {
        status: 'unresolved',
        orgId: null,
        slug: null,
        name: null,
        source: 'none',
      }
    );
  }

  private collectTenantCandidates(request: Request): TenantCandidate[] {
    const headerSlug = this.getTenantSlugHeader(request);
    const routeOrgId = this.getRequestValue(request.params?.orgId);
    const bodyOrgId = this.getBodyOrgId(request.body);

    const candidates: TenantCandidate[] = [];
    if (headerSlug) {
      candidates.push({ source: 'header', value: headerSlug });
    }
    if (routeOrgId) {
      candidates.push({ source: 'route_param', value: routeOrgId });
    }
    if (bodyOrgId) {
      candidates.push({ source: 'body', value: bodyOrgId });
    }

    return candidates;
  }

  private async buildTenantContext(
    candidates: TenantCandidate[],
  ): Promise<TenantRequestContext> {
    if (candidates.length === 0) {
      return {
        status: 'unresolved',
        orgId: null,
        slug: null,
        name: null,
        source: 'none',
      };
    }

    const slugCandidates = [
      ...new Set(
        candidates
          .filter((candidate) => candidate.source === 'header')
          .map((candidate) => candidate.value),
      ),
    ];
    const idCandidates = [
      ...new Set(
        candidates
          .filter((candidate) => candidate.source !== 'header')
          .map((candidate) => candidate.value),
      ),
    ];

    const [organizationsBySlug, organizationsById] = await Promise.all([
      this.tenantLookupRepository.findOrganizationsBySlugs(slugCandidates),
      this.tenantLookupRepository.findOrganizationsByIds(idCandidates),
    ]);

    const slugMap = new Map<string, TenantIdentity>(
      organizationsBySlug.map((organization) => [
        organization.slug,
        {
          orgId: organization.id,
          slug: organization.slug,
          name: organization.name,
        },
      ]),
    );
    const idMap = new Map<string, TenantIdentity>(
      organizationsById.map((organization) => [
        organization.id,
        {
          orgId: organization.id,
          slug: organization.slug,
          name: organization.name,
        },
      ]),
    );

    const resolvedCandidates = candidates
      .map((candidate) => ({
        candidate,
        tenant:
          candidate.source === 'header'
            ? slugMap.get(candidate.value) ?? null
            : idMap.get(candidate.value) ?? null,
      }))
      .filter(
        (
          entry,
        ): entry is { candidate: TenantCandidate; tenant: TenantIdentity } =>
          entry.tenant !== null,
      );

    const distinctOrgIds = [
      ...new Set(resolvedCandidates.map((entry) => entry.tenant.orgId)),
    ];
    if (distinctOrgIds.length > 1) {
      return {
        status: 'conflict',
        orgId: null,
        slug: null,
        name: null,
        source: 'conflict',
      };
    }

    const winningCandidate = resolvedCandidates[0];
    if (!winningCandidate) {
      return {
        status: 'unresolved',
        orgId: null,
        slug: null,
        name: null,
        source: candidates[0]?.source ?? 'none',
      };
    }

    return {
      status: 'resolved',
      orgId: winningCandidate.tenant.orgId,
      slug: winningCandidate.tenant.slug,
      name: winningCandidate.tenant.name,
      source: winningCandidate.candidate.source,
    };
  }

  private getTenantSlugHeader(request: Request): string | null {
    const headerValue = request.headers[HEADER_TENANT_SLUG];
    const normalizedValue = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    return this.normalizeValue(normalizedValue);
  }

  private getBodyOrgId(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const candidate = (body as Record<string, unknown>).orgId;
    return typeof candidate === 'string' ? this.normalizeValue(candidate) : null;
  }

  private getRequestValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
      return this.normalizeValue(value[0]);
    }

    return this.normalizeValue(value);
  }

  private normalizeValue(value: string | undefined): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
