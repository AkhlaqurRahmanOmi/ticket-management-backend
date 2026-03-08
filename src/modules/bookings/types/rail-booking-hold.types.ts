export type RailRequestedSegmentRecord = {
  boardingTripStopId: string;
  dropTripStopId: string;
  boardingStationCode: string;
  dropStationCode: string;
  boardingSequence: number;
  dropSequence: number;
};

export type RailHoldItemRecord = {
  tripSeatId: string;
  coachCode: string;
  seatNo: string;
  seatCode: string;
  quantity: number;
  priceCents: number;
  feesCents: number;
  seatLabel: string | null;
};

export type RailBookingHoldRecord = {
  id: string;
  bookingId: string;
  tripId: string;
  userId: string;
  status: string;
  expiresAt: Date;
  idempotencyKey: string;
  createdAt: Date;
  requestedSegment: RailRequestedSegmentRecord;
  items: RailHoldItemRecord[];
};

export type CreateRailSeatHoldInput = {
  userId: string;
  tripId: string;
  tripSeatId: string;
  boardingTripStopId: string;
  dropTripStopId: string;
  boardingStationCode: string;
  dropStationCode: string;
  boardingSequence: number;
  dropSequence: number;
  idempotencyKey: string;
  ttlMinutes: number;
  correlationId: string;
};

export type RailSeatHoldInput = Omit<
  CreateRailSeatHoldInput,
  'userId' | 'ttlMinutes' | 'correlationId'
>;

export type CreateRailSeatHoldResult = {
  hold: RailBookingHoldRecord;
  correlationId: string;
  resolution: 'created' | 'existing' | 'recovered';
};

export type ExpireRailBookingHoldResult = {
  updated: boolean;
  bookingId: string;
  inventoryScopeId: string;
  releasedInventoryRefIds: string[];
};
