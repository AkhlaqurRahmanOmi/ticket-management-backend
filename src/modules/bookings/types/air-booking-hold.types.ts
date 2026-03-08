export type AirRequestedLegRangeRecord = {
  originLegInstanceId: string | null;
  destinationLegInstanceId: string | null;
  originAirportCode: string;
  destinationAirportCode: string;
  originSequence: number;
  destinationSequence: number;
};

export type AirHoldItemRecord = {
  flightCabinInventoryId: string;
  cabinCode: string;
  fareClassCode: string;
  quantity: number;
  priceCents: number;
  feesCents: number;
};

export type AirBookingHoldRecord = {
  id: string;
  bookingId: string;
  flightInstanceId: string;
  userId: string;
  status: string;
  expiresAt: Date;
  idempotencyKey: string;
  createdAt: Date;
  requestedLegRange: AirRequestedLegRangeRecord;
  items: AirHoldItemRecord[];
};

export type CreateAirCabinHoldInput = {
  userId: string;
  flightInstanceId: string;
  flightCabinInventoryId: string;
  originLegInstanceId: string | null;
  destinationLegInstanceId: string | null;
  originAirportCode: string;
  destinationAirportCode: string;
  originSequence: number;
  destinationSequence: number;
  quantity: number;
  idempotencyKey: string;
  ttlMinutes: number;
  correlationId: string;
};

export type AirCabinHoldInput = Omit<
  CreateAirCabinHoldInput,
  'userId' | 'ttlMinutes' | 'correlationId'
>;

export type CreateAirCabinHoldResult = {
  hold: AirBookingHoldRecord;
  correlationId: string;
  resolution: 'created' | 'existing' | 'recovered';
};
