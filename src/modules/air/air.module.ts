import { Module } from '@nestjs/common';
import { AirController } from './air.controller';
import { AirRepository } from './air.repository';
import { AirService } from './air.service';

@Module({
  controllers: [AirController],
  providers: [AirService, AirRepository],
  exports: [AirService],
})
export class AirModule {}
