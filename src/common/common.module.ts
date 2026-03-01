import { Global, Module } from '@nestjs/common';
import { MetricsProvider } from './providers/metrics.provider';

@Global()
@Module({
  providers: [MetricsProvider],
  exports: [MetricsProvider],
})
export class CommonModule {}
