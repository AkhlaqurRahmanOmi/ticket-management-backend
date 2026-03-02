import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import { RailRepository } from './rail.repository';

@Injectable()
export class RailService {
  constructor(private readonly railRepository: RailRepository) {}

  searchTrips(query: SearchRailTripsQueryDto) {
    this.assertValidDepartureDate(query.departureDate);
    return this.railRepository.searchTrips(query);
  }

  async getTripSeatAvailability(
    tripId: string,
    query: GetRailTripAvailabilityQueryDto,
  ) {
    const trip = await this.railRepository.findTripById(tripId);
    if (!trip) {
      throw new NotFoundException('Rail trip not found.');
    }

    const seatAvailability =
      await this.railRepository.getTripSeatAvailability(tripId, query);

    return {
      trip,
      items: seatAvailability.items,
      meta: seatAvailability.meta,
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
}
