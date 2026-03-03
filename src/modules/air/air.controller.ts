import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GetFlightAvailabilityQueryDto } from './dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import { AirService } from './air.service';

@ApiTags('Air Booking')
@Controller('flights')
export class AirController {
  constructor(private readonly airService: AirService) {}

  @Get('search')
  searchFlights(@Query() query: SearchFlightsQueryDto) {
    return this.airService.searchFlights(query);
  }

  @Get(':flightInstanceId/availability')
  getFlightAvailability(
    @Param('flightInstanceId', ParseUUIDPipe) flightInstanceId: string,
    @Query() query: GetFlightAvailabilityQueryDto,
  ) {
    return this.airService.getFlightAvailability(flightInstanceId, query);
  }
}
