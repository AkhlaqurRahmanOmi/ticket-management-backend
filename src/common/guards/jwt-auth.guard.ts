import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AuthUser } from '@/common/auth/auth-user.type';
import { AUTHORIZATION_PROVIDER } from '@/modules/iam/provider/token/tokens';
import type { AuthorizationProvider } from '@/modules/iam/provider/authorization/authorization-provider.contract';

type JwtPayload = {
  sub?: string;
  email?: string;
  roles?: string[];
  memberships?: AuthUser['memberships'];
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const secret =
      this.configService.get<string>('auth.jwtSecret') ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('JWT secret is not configured.');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token.');
    }

    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const authorizationProvider = this.moduleRef.get<AuthorizationProvider>(
      AUTHORIZATION_PROVIDER,
      { strict: false },
    );

    const authorizationContext = authorizationProvider
      ? await authorizationProvider.getUserAuthorizationContext(payload.sub)
      : undefined;

    request.user = {
      id: payload.sub,
      email: payload.email,
      roles: authorizationContext?.roles ?? payload.roles ?? [],
      permissions: authorizationContext?.permissions ?? [],
      memberships:
        authorizationContext?.memberships ?? payload.memberships ?? [],
    };

    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) return undefined;
    return token;
  }
}
