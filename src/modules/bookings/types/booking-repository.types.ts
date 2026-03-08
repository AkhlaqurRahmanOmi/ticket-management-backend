export type ReservationHoldRow = {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  expiresAt: Date;
  idempotencyKey: string;
  createdAt: Date;
  items: Array<{
    eventSeatId: string | null;
    quantity: number;
    priceCents: number;
    feesCents: number;
  }>;
};

export type BookingPaymentTargetItemRow = {
  quantity: number;
  unitPriceCents: number;
  feesCents: number;
  inventoryType: string;
  inventoryRefId: string;
  seatLabel: string | null;
};

export type BookingPaymentTargetRow = {
  id: string;
  domainType: 'EVENT' | 'RAIL' | 'AIR';
  userId: string;
  orgId: string | null;
  status: string;
  holdExpiresAt: Date | null;
  currency: string;
  metadata: unknown;
  items: BookingPaymentTargetItemRow[];
};

export type ExpiredHoldCandidate = {
  id: string;
  source: 'reservation' | 'rail-booking' | 'air-booking';
  expiresAt: Date;
};

export type RailHoldRow = {
  id: string;
  userId: string;
  status: string;
  holdExpiresAt: Date | null;
  idempotencyKey: string;
  createdAt: Date;
  metadata: unknown;
  items: Array<{
    id: string;
    inventoryRefId: string;
    quantity: number;
    unitPriceCents: number;
    feesCents: number;
    seatLabel: string | null;
    railSeatAllocations: Array<{
      tripId: string;
      tripSeatId: string;
      boardingSequence: number;
      dropSequence: number;
      boardingTripStopId: string;
      dropTripStopId: string;
      boardingTripStop: {
        station: {
          code: string;
        };
      };
      dropTripStop: {
        station: {
          code: string;
        };
      };
      tripSeat: {
        coach: {
          code: string;
        };
        seat: {
          seatNumber: string;
          code: string;
          label: string | null;
        };
      };
    }>;
  }>;
};

export type AirHoldBookingRow = {
  id: string;
  userId: string;
  status: string;
  holdExpiresAt: Date | null;
  idempotencyKey: string;
  createdAt: Date;
  metadata: unknown;
};

export type AirHoldAllocationRow = {
  flightInstanceId: string;
  flightCabinInventoryId: string;
  originLegInstanceId: string | null;
  destinationLegInstanceId: string | null;
  originSequence: number;
  destinationSequence: number;
  quantity: number;
  unitPriceCents: number;
  feesCents: number;
  cabinCode: string;
  fareClassCode: string;
};
