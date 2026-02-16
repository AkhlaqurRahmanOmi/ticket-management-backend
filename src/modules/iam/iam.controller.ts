import { Body, Controller, Post } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IamService } from './iam.service';

@Controller('auth')
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.iamService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.iamService.login(dto);
  }
}
