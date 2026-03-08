export type RailTripSegmentRow = {
  tripId: string;
  boardingSequence: number;
  dropSequence: number;
};

export type RailCountRow = {
  total: bigint | number | string;
};

export type RailResolvedSegment = {
  boardingStationCode: string;
  dropStationCode: string;
  boardingSequence: number;
  dropSequence: number;
};

export type RailResolvedTripStopSegment = RailResolvedSegment & {
  boardingTripStopId: string;
  dropTripStopId: string;
  isBoardingAllowed: boolean;
  isDropAllowed: boolean;
};

export type RailSegmentAllocationRow = {
  tripSeatId: string;
  bookingStatus: string;
  holdExpiresAt: Date | null;
};
