import { Module } from '@nestjs/common';
import { BookingsModule } from '@/modules/bookings/bookings.module';
import { RailController } from './rail.controller';
import { RailRepository } from './rail.repository';
import { RailService } from './rail.service';

@Module({
  imports: [BookingsModule],
  controllers: [RailController],
  providers: [RailService, RailRepository],
  exports: [RailService],
})
export class RailModule {}
