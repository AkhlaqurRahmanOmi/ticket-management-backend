import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AUTHORIZATION_PROVIDER,
  PASSWORD_HASHER,
  ROLE_ASSIGNMENT_PROVIDER,
  TOKEN_SERVICE,
} from './provider/token/tokens';
import type { PasswordHasher } from './provider/password/password-hasher.contract';
import type { TokenService } from './provider/token/token-service.contract';
import { UsersRepository } from './users.repository';
import type { RoleAssignmentProvider } from './provider/authorization/role-assignment.provider.contract';
import type { AuthorizationProvider } from './provider/authorization/authorization-provider.contract';

@Injectable()
export class IamService {
  constructor(
    private readonly usersRepository: UsersRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(ROLE_ASSIGNMENT_PROVIDER)
    private readonly roleAssignmentProvider: RoleAssignmentProvider,
    @Inject(AUTHORIZATION_PROVIDER)
    private readonly authorizationProvider: AuthorizationProvider,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.usersRepository.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already exists.');
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.usersRepository.create({
      email,
      passwordHash,
      displayName: dto.displayName,
    });
    await this.roleAssignmentProvider.assignRoleByName(user.id, 'USER');

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const authorization =
      await this.authorizationProvider.getUserAuthorizationContext(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      authorization,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const validPassword = await this.passwordHasher.compare(
      dto.password,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive.');
    }

    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      email: user.email,
    });
    const authorization =
      await this.authorizationProvider.getUserAuthorizationContext(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      authorization,
    };
  }
}
