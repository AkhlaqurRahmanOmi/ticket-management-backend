import { Injectable } from '@nestjs/common';
import type {
  TenantCustomerLinkingInput,
  TenantCustomerLinkingProvider,
  TenantCustomerLinkingResult,
} from '../contracts/tenant-customer-linking.contract';

@Injectable()
export class NoopTenantCustomerLinkingProvider
  implements TenantCustomerLinkingProvider
{
  async resolveLink(
    _input: TenantCustomerLinkingInput,
  ): Promise<TenantCustomerLinkingResult> {
    return {
      mode: 'deferred',
      platformUserId: null,
    };
  }
}
