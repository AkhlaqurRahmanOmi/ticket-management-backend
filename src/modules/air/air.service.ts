import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GetFlightAvailabilityQueryDto } from './dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import { AirRepository } from './air.repository';

@Injectable()
export class AirService {
  constructor(private readonly airRepository: AirRepository) {}

  searchFlights(query: SearchFlightsQueryDto) {
    this.assertValidDepartureDate(query.departureDate);
    this.assertDistinctAirports(query.originCode, query.destinationCode);

    return this.airRepository.searchFlights(query);
  }

  async getFlightAvailability(
    flightInstanceId: string,
    query: GetFlightAvailabilityQueryDto,
  ) {
    const flight = await this.airRepository.findFlightById(flightInstanceId);
    if (!flight) {
      throw new NotFoundException('Flight instance not found.');
    }

    const availability = await this.airRepository.getFlightAvailability(
      flightInstanceId,
      query,
    );

    return {
      flight,
      items: availability.items,
      meta: availability.meta,
    };
  }

  private assertValidDepartureDate(departureDate: string): void {
    const parsedDate = new Date(`${departureDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        'departureDate must be a valid YYYY-MM-DD value.',
      );
    }
  }

  private assertDistinctAirports(
    originCode: string,
    destinationCode: string,
  ): void {
    if (originCode === destinationCode) {
      throw new BadRequestException(
        'originCode and destinationCode must be different airports.',
      );
    }
  }
}
