import { Module } from '@nestjs/common';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { AirController } from './air.controller';
import { AirReadRepository } from './repositories/air-read.repository';
import { AirService } from './air.service';

@Module({
  imports: [BookingsModule],
  controllers: [AirController],
  providers: [AirService, AirReadRepository],
  exports: [AirService],
})
export class AirModule {}
