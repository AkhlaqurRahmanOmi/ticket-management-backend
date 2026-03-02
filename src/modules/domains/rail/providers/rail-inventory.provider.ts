import { Injectable, NotImplementedException } from '@nestjs/common';
import { GetRailTripAvailabilityQueryDto } from '@/modules/rail/dto/get-rail-trip-availability.query.dto';
import { RailService } from '@/modules/rail/rail.service';

@Injectable()
export class RailInventoryProvider {
  constructor(private readonly railService: RailService) {}

  getSeatMap(
    inventoryScopeId: string,
    query?: GetRailTripAvailabilityQueryDto,
  ) {
    return this.railService.getTripSeatAvailability(inventoryScopeId, query ?? {});
  }

  syncSeatInventory(
    _actorUserId: string,
    _inventoryScopeId: string,
  ) {
    throw new NotImplementedException(
      'Rail seat inventory sync is not implemented yet.',
    );
  }

  createHold(
    _userId: string,
    _dto: Record<string, unknown>,
    _correlationId?: string,
  ) {
    throw new NotImplementedException(
      'Rail seat hold creation is not implemented yet.',
    );
  }

  getHold(_holdId: string) {
    throw new NotImplementedException(
      'Rail hold retrieval is not implemented yet.',
    );
  }

  expireHolds(_batchSize = 100) {
    return {
      scanned: 0,
      expired: 0,
      results: [],
    };
  }
}
