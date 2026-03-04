import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingsService } from '@/modules/bookings/bookings.service';
import { type AirCabinHoldInput } from '@/modules/bookings/types/air-booking-hold.types';
import { CreateAirHoldDto } from './dto/create-air-hold.dto';
import { GetFlightAvailabilityQueryDto } from './dto/get-flight-availability.query.dto';
import { SearchFlightsQueryDto } from './dto/search-flights.query.dto';
import { AirReadRepository } from './repositories/air-read.repository';
import type {
  FlightInventoryModel,
  FlightRequestedLegRange,
} from './types/air-search.types';

@Injectable()
export class AirService {
  constructor(
    private readonly airReadRepository: AirReadRepository,
    private readonly bookingsService: BookingsService,
  ) {}

  searchFlights(query: SearchFlightsQueryDto) {
    this.assertValidDepartureDate(query.departureDate);
    this.assertDistinctAirports(query.originCode, query.destinationCode);

    return this.airReadRepository.searchFlights(query).then((result) => ({
      ...result,
      inventoryModel: this.buildInventoryModel(),
    }));
  }

  async getFlightAvailability(
    flightInstanceId: string,
    query: GetFlightAvailabilityQueryDto,
  ) {
    const flight = await this.airReadRepository.findFlightById(flightInstanceId);
    if (!flight) {
      throw new NotFoundException('Flight instance not found.');
    }

    const requestedLegRangeInput = this.resolveRequestedLegRangeInput(query);
    const requestedLegRange = requestedLegRangeInput
      ? await this.airReadRepository.resolveFlightLegRangeByAirportCodes(
          flightInstanceId,
          requestedLegRangeInput.originCode,
          requestedLegRangeInput.destinationCode,
        )
      : null;

    if (requestedLegRangeInput && !requestedLegRange) {
      throw new BadRequestException(
        'The requested origin and destination airports are not valid for this flight instance.',
      );
    }

    const flightLegs =
      await this.airReadRepository.findFlightLegs(flightInstanceId);
    const effectiveRequestedLegRange =
      requestedLegRange ?? this.buildDefaultLegRange(flight, flightLegs);
    const availability = await this.airReadRepository.getFlightAvailability(
      flightInstanceId,
      query,
      effectiveRequestedLegRange,
    );

    return {
      flight: {
        ...flight,
        legs: flightLegs,
      },
      requestedLegRange: effectiveRequestedLegRange,
      items: availability.items,
      meta: availability.meta,
      inventoryModel: this.buildInventoryModel(),
    };
  }

  async createHold(
    userId: string,
    flightInstanceId: string,
    dto: CreateAirHoldDto,
    correlationId?: string,
  ) {
    const flight =
      await this.airReadRepository.findFlightById(flightInstanceId);
    if (!flight) {
      throw new NotFoundException('Flight instance not found.');
    }

    const resolvedLegRange =
      await this.airReadRepository.resolveFlightHoldLegRangeByAirportCodes(
        flightInstanceId,
        dto.originCode,
        dto.destinationCode,
      );

    if (!resolvedLegRange) {
      throw new BadRequestException(
        'The requested origin and destination airports are not valid for this flight instance.',
      );
    }

    const result = await this.bookingsService.createAirCabinHold(
      userId,
      this.mapAirHoldInput(flightInstanceId, dto, resolvedLegRange),
      correlationId,
    );

    return result.hold;
  }

  async getHold(userId: string, holdId: string) {
    const hold = await this.getHoldById(holdId);
    if (hold.userId !== userId) {
      throw new ForbiddenException('You can only access your own air hold.');
    }

    return hold;
  }

  getHoldById(holdId: string) {
    return this.bookingsService.getAirHoldOrThrow(holdId);
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

  private resolveRequestedLegRangeInput(query: GetFlightAvailabilityQueryDto): {
    originCode: string;
    destinationCode: string;
  } | null {
    const hasOrigin = Boolean(query.originCode);
    const hasDestination = Boolean(query.destinationCode);

    if (!hasOrigin && !hasDestination) {
      return null;
    }

    if (!hasOrigin || !hasDestination) {
      throw new BadRequestException(
        'originCode and destinationCode must be provided together.',
      );
    }

    if (query.originCode === query.destinationCode) {
      throw new BadRequestException(
        'originCode and destinationCode must be different airports.',
      );
    }

    return {
      originCode: query.originCode!,
      destinationCode: query.destinationCode!,
    };
  }

  private buildInventoryModel(): FlightInventoryModel {
    return {
      inventoryLevel: 'CABIN_FARE',
      seatAssignmentMode: 'OPTIONAL',
      legAware: true,
    };
  }

  private buildDefaultLegRange(
    flight: {
      origin: { code: string };
      destination: { code: string };
    },
    legs: Array<{ sequence: number; origin: { code: string }; destination: { code: string } }>,
  ): FlightRequestedLegRange {
    if (legs.length === 0) {
      return {
        originAirportCode: flight.origin.code,
        destinationAirportCode: flight.destination.code,
        originSequence: 1,
        destinationSequence: 1,
      };
    }

    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    return {
      originAirportCode: firstLeg.origin.code,
      destinationAirportCode: lastLeg.destination.code,
      originSequence: firstLeg.sequence,
      destinationSequence: lastLeg.sequence,
    };
  }

  private mapAirHoldInput(
    flightInstanceId: string,
    dto: CreateAirHoldDto,
    resolvedLegRange: {
      originLegInstanceId: string | null;
      destinationLegInstanceId: string | null;
      originSequence: number;
      destinationSequence: number;
    },
  ): AirCabinHoldInput {
    return {
      flightInstanceId,
      flightCabinInventoryId: dto.flightCabinInventoryId,
      originLegInstanceId: resolvedLegRange.originLegInstanceId,
      destinationLegInstanceId: resolvedLegRange.destinationLegInstanceId,
      originAirportCode: dto.originCode,
      destinationAirportCode: dto.destinationCode,
      originSequence: resolvedLegRange.originSequence,
      destinationSequence: resolvedLegRange.destinationSequence,
      quantity: dto.quantity ?? 1,
      idempotencyKey: dto.idempotencyKey,
    };
  }
}
