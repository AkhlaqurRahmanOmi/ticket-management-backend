import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { AuthTokenPayload, TokenService } from './token-service.contract';

@Injectable()
export class JwtTokenProvider implements TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signAccessToken(payload: AuthTokenPayload): Promise<string> {
    const secret =
      this.configService.get<string>('auth.jwtSecret') ?? process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT secret is not configured.');
    }

    const expiresIn =
      this.configService.get<string>('auth.jwtExpiresIn') ??
      process.env.JWT_EXPIRES_IN ??
      '1d';

    return this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as StringValue,
    });
  }
}
