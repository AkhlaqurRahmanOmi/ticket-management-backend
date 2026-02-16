import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '@/common/auth/auth-user.type';

export const POLICIES_KEY = 'policies';

export type PolicyContext = {
  user: AuthUser;
  request: Request;
};

export interface PolicyHandler {
  handle(context: PolicyContext): boolean | Promise<boolean>;
}

export type PolicyHandlerCallback = (
  context: PolicyContext,
) => boolean | Promise<boolean>;

export type PolicyDefinition =
  | PolicyHandler
  | PolicyHandlerCallback
  | string
  | symbol;

export const CheckPolicies = (...policies: PolicyDefinition[]) =>
  SetMetadata(POLICIES_KEY, policies);
