import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from '@/modules/bookings/bookings.service';
import { type RailSeatHoldInput } from '@/modules/bookings/types/rail-booking-hold.types';
import { CreateRailHoldDto } from './dto/create-rail-hold.dto';
import { GetRailTripAvailabilityQueryDto } from './dto/get-rail-trip-availability.query.dto';
import { SearchRailTripsQueryDto } from './dto/search-rail-trips.query.dto';
import { RailRepository } from './rail.repository';
import { type RailResolvedTripStopSegment } from './types/rail-repository.types';

@Injectable()
export class RailService {
  constructor(
    private readonly railRepository: RailRepository,
    private readonly bookingsService: BookingsService,
  ) {}

  searchTrips(query: SearchRailTripsQueryDto) {
    this.assertValidDepartureDate(query.departureDate);
    this.assertDistinctStations(query.originCode, query.destinationCode);

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

    const requestedSegment = this.resolveRequestedSegment(query);
    const resolvedSegment = requestedSegment
      ? await this.railRepository.resolveTripStopSegmentByStationCodes(
          tripId,
          requestedSegment.boardingStationCode,
          requestedSegment.dropStationCode,
        )
      : null;

    if (requestedSegment && !resolvedSegment) {
      throw new BadRequestException(
        'The requested boarding and drop stations are not valid for this trip.',
      );
    }

    const seatAvailability =
      await this.railRepository.getTripSeatAvailability(
        tripId,
        query,
        resolvedSegment,
      );

    return {
      trip,
      requestedSegment: resolvedSegment
        ? {
            boardingStationCode: resolvedSegment.boardingStationCode,
            dropStationCode: resolvedSegment.dropStationCode,
            boardingSequence: resolvedSegment.boardingSequence,
            dropSequence: resolvedSegment.dropSequence,
          }
        : null,
      items: seatAvailability.items,
      meta: seatAvailability.meta,
    };
  }

  async createHold(
    userId: string,
    tripId: string,
    dto: CreateRailHoldDto,
    correlationId?: string,
  ) {
    const resolvedSegment =
      await this.railRepository.resolveTripStopSegmentByStationCodes(
        tripId,
        dto.boardingStationCode,
        dto.dropStationCode,
      );

    if (!resolvedSegment) {
      throw new BadRequestException(
        'The requested boarding and drop stations are not valid for this trip.',
      );
    }

    if (!resolvedSegment.isBoardingAllowed || !resolvedSegment.isDropAllowed) {
      throw new BadRequestException(
        'The requested rail segment cannot be booked for boarding or drop at the selected stops.',
      );
    }

    const result = await this.bookingsService.createRailSeatHold(
      userId,
      this.mapRailHoldInput(tripId, dto, resolvedSegment),
      correlationId,
    );

    return result.hold;
  }

  async getHold(userId: string, holdId: string) {
    const hold = await this.getHoldById(holdId);
    if (hold.userId !== userId) {
      throw new ForbiddenException('You can only access your own rail hold.');
    }

    return hold;
  }

  getHoldById(holdId: string) {
    return this.bookingsService.getRailHoldOrThrow(holdId);
  }

  processExpiredHolds(batchSize = 100) {
    return this.bookingsService.processExpiredHolds(batchSize);
  }

  private assertValidDepartureDate(departureDate: string): void {
    const parsedDate = new Date(`${departureDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(
        'departureDate must be a valid YYYY-MM-DD value.',
      );
    }
  }

  private assertDistinctStations(originCode: string, destinationCode: string): void {
    if (originCode === destinationCode) {
      throw new BadRequestException(
        'originCode and destinationCode must be different stations.',
      );
    }
  }

  private resolveRequestedSegment(query: GetRailTripAvailabilityQueryDto): {
    boardingStationCode: string;
    dropStationCode: string;
  } | null {
    const hasBoarding = Boolean(query.boardingStationCode);
    const hasDrop = Boolean(query.dropStationCode);

    if (!hasBoarding && !hasDrop) {
      return null;
    }

    if (!hasBoarding || !hasDrop) {
      throw new BadRequestException(
        'boardingStationCode and dropStationCode must be provided together.',
      );
    }

    if (query.boardingStationCode === query.dropStationCode) {
      throw new BadRequestException(
        'boardingStationCode and dropStationCode must be different stations.',
      );
    }

    return {
      boardingStationCode: query.boardingStationCode!,
      dropStationCode: query.dropStationCode!,
    };
  }

  private mapRailHoldInput(
    tripId: string,
    dto: CreateRailHoldDto,
    resolvedSegment: RailResolvedTripStopSegment,
  ): RailSeatHoldInput {
    return {
      tripId,
      tripSeatId: dto.tripSeatId,
      boardingTripStopId: resolvedSegment.boardingTripStopId,
      dropTripStopId: resolvedSegment.dropTripStopId,
      boardingStationCode: resolvedSegment.boardingStationCode,
      dropStationCode: resolvedSegment.dropStationCode,
      boardingSequence: resolvedSegment.boardingSequence,
      dropSequence: resolvedSegment.dropSequence,
      idempotencyKey: dto.idempotencyKey,
    };
  }
}
