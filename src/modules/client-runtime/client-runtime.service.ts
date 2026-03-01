import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ClientProfileMetadata = {
  key: string;
  isDefault: boolean;
};

@Injectable()
export class ClientRuntimeService {
  constructor(private readonly configService: ConfigService) {}

  getClientProfile(): string {
    const configuredProfile = this.configService.get<string>('app.clientProfile');
    if (!configuredProfile || configuredProfile.trim().length === 0) {
      return 'default';
    }

    return configuredProfile.trim();
  }

  getClientProfileMetadata(): ClientProfileMetadata {
    const profile = this.getClientProfile();

    return {
      key: profile,
      isDefault: profile === 'default',
    };
  }

  isClientProfile(profile: string): boolean {
    return this.getClientProfile() === profile;
  }
}
