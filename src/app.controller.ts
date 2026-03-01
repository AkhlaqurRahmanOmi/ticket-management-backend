import { Controller, Get, Header, Param, ParseIntPipe } from '@nestjs/common';
import { MetricsProvider } from './common/providers/metrics.provider';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly metricsProvider: MetricsProvider,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('echo/:id')
  getEcho(@Param('id', ParseIntPipe) id: number): { id: number } {
    return { id };
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.metricsProvider.renderPrometheus();
  }
}
