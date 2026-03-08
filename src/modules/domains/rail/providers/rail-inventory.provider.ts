import { Injectable, NotImplementedException } from '@nestjs/common';
import { CreateRailHoldDto } from '@/modules/rail/dto/create-rail-hold.dto';
import { GetRailTripAvailabilityQueryDto } from '@/modules/rail/dto/get-rail-trip-availability.query.dto';
import { RailService } from '@/modules/rail/rail.service';

@Injectable()
export class RailInventoryProvider {
  constructor(private readonly railService: RailService) {}

  getSeatMap(
    tenantOrgId: string,
    inventoryScopeId: string,
    query?: GetRailTripAvailabilityQueryDto,
  ) {
    return this.railService.getTripSeatAvailability(
      tenantOrgId,
      inventoryScopeId,
      query ?? {},
    );
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
    userId: string,
    tenantOrgId: string,
    dto: CreateRailHoldDto & { tripId: string },
    correlationId?: string,
  ) {
    return this.railService.createHold(
      userId,
      tenantOrgId,
      dto.tripId,
      dto,
      correlationId,
    );
  }

  getHold(holdId: string) {
    return this.railService.getHoldById(holdId);
  }

  expireHolds(batchSize = 100) {
    return this.railService.processExpiredHolds(batchSize);
  }
}
