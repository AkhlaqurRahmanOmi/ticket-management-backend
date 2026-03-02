import { Module } from '@nestjs/common';
import { RailController } from './rail.controller';
import { RailRepository } from './rail.repository';
import { RailService } from './rail.service';

@Module({
  controllers: [RailController],
  providers: [RailService, RailRepository],
  exports: [RailService],
})
export class RailModule {}
