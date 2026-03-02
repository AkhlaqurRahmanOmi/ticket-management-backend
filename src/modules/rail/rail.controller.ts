import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import { RailService } from './rail.service';

@Controller('trips')
export class RailController {
  constructor(private readonly railService: RailService) {}

  @Get('search')
  searchTrips(@Query() query: SearchRailTripsQueryDto) {
    return this.railService.searchTrips(query);
  }

  @Get(':tripId/availability')
  getTripSeatAvailability(
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Query() query: GetRailTripAvailabilityQueryDto,
  ) {
    return this.railService.getTripSeatAvailability(tripId, query);
  }
}
