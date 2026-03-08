import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { HEADER_TENANT_SLUG } from '@/common/constants/headers';

export const TenantHeaderDoc = () =>
  applyDecorators(
    ApiHeader({
      name: HEADER_TENANT_SLUG,
      required: true,
      description:
        'Tenant slug used to resolve the active tenant context for this request.',
    }),
  );
