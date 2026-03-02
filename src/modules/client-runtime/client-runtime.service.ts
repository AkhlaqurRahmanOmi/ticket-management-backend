import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  CLIENT_PROFILE_LABELS,
  DEFAULT_CLIENT_PROFILE,
  type ClientProfile,
  type ClientProfileMetadata,
  isClientProfile,
} from './client.types';
import { CLIENT_POLICY_OVERRIDE_REGISTRY } from './client.tokens';
import type {
  ClientPolicyOverrideKey,
  ClientPolicyOverrideRegistry,
} from './interfaces/client-policy-override-registry.interface';

@Injectable()
export class ClientRuntimeService {
  constructor(
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  getClientProfile(): ClientProfile {
    const configuredProfile = this.configService.get<string>('app.clientProfile');
    const effectiveProfile =
      configuredProfile && configuredProfile.trim().length > 0
        ? configuredProfile.trim()
        : DEFAULT_CLIENT_PROFILE;

    if (!isClientProfile(effectiveProfile)) {
      throw new Error(
        `CLIENT_PROFILE=${effectiveProfile} is configured, but its client pack is not wired yet.`,
      );
    }

    return effectiveProfile;
  }

  getClientProfileMetadata(): ClientProfileMetadata {
    const profile = this.getClientProfile();
    const overrideRegistry = this.getOverrideRegistry();

    const policyOverrides = Object.keys(
      overrideRegistry?.overrides ?? {},
    ) as ClientPolicyOverrideKey[];

    return {
      key: profile,
      label: overrideRegistry?.label ?? CLIENT_PROFILE_LABELS[profile],
      isDefault: profile === DEFAULT_CLIENT_PROFILE,
      overridePackActive: policyOverrides.length > 0,
      policyOverrides,
    };
  }

  isClientProfile(profile: string): boolean {
    return this.getClientProfile() === profile;
  }

  private getOverrideRegistry(): ClientPolicyOverrideRegistry | null {
    try {
      return (
        this.moduleRef.get<ClientPolicyOverrideRegistry>(
          CLIENT_POLICY_OVERRIDE_REGISTRY,
          { strict: false },
        ) ?? null
      );
    } catch {
      return null;
    }
  }
}
