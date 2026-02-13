import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('echo/:id')
  getEcho(@Param('id', ParseIntPipe) id: number): { id: number } {
    return { id };
  }
}
