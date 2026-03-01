import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthProvider } from './providers/health.provider';

@Controller('health')
export class HealthController {
  constructor(private readonly healthProvider: HealthProvider) {}

  @Get('live')
  getLiveness() {
    return this.healthProvider.getLivenessReport();
  }

  @Get('ready')
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const report = await this.healthProvider.getReadinessReport();
    if (!report.ready) {
      response.status(503);
    }
    return report;
  }

  @Get('alerts')
  async getAlerts(@Res({ passthrough: true }) response: Response) {
    const report = await this.healthProvider.getAlertsReport();
    if (report.critical) {
      response.status(503);
    }
    return report;
  }
}
