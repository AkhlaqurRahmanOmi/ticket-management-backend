import type { PaginationMeta } from '@/common/repositories/base.repository';

export type RailStationSummary = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  country: string | null;
};

export type RailRequestedSegment = {
  boardingStationCode: string;
  dropStationCode: string;
  boardingSequence: number;
  dropSequence: number;
};

export type RailTripAvailabilitySummary = {
  totalSeats: number;
  availableSeats: number;
  reservedSeats: number;
  soldSeats: number;
  blockedSeats: number;
};

export type RailTripSummary = {
  id: string;
  tripNumber: string;
  title: string | null;
  status: string;
  departsAt: Date;
  arrivesAt: Date;
  currency: string;
  basePriceCents: number;
  feesCents: number;
  origin: RailStationSummary;
  destination: RailStationSummary;
};

export type RailTripSearchItem = RailTripSummary & {
  availability: RailTripAvailabilitySummary;
  requestedSegment: RailRequestedSegment;
};

export type RailTripSearchResult = {
  items: RailTripSearchItem[];
  meta: PaginationMeta;
};

export type RailTripAvailabilityItem = {
  id: string;
  coachCode: string;
  seatClass: string | null;
  seatNo: string;
  seatCode: string;
  seatLabel: string | null;
  status: string;
  reservedUntil: Date | null;
  priceCents: number;
  feesCents: number;
};

export type RailTripSeatAvailabilityResult = {
  trip: RailTripSummary;
  requestedSegment: RailRequestedSegment | null;
  items: RailTripAvailabilityItem[];
  meta: PaginationMeta;
};
