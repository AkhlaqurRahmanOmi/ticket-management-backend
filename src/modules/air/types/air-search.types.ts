import type { PaginationMeta } from '@/common/repositories/base.repository';

export type AirportSummary = {
  id: string;
  code: string;
  name: string;
  city: string | null;
  country: string | null;
};

export type CarrierSummary = {
  id: string;
  code: string;
  name: string;
};

export type FlightLegSummary = {
  id: string;
  sequence: number;
  origin: AirportSummary;
  destination: AirportSummary;
  departsAt: Date;
  arrivesAt: Date;
};

export type FlightRequestedLegRange = {
  originAirportCode: string;
  destinationAirportCode: string;
  originSequence: number;
  destinationSequence: number;
};

export type FlightInventoryModel = {
  inventoryLevel: 'CABIN_FARE';
  seatAssignmentMode: 'OPTIONAL';
  legAware: true;
};

export type FlightAvailabilitySummary = {
  totalSeats: number;
  availableSeats: number;
  reservedSeats: number;
  soldSeats: number;
};

export type FlightInstanceSummary = {
  id: string;
  flightNumber: string;
  title: string | null;
  status: string;
  departsAt: Date;
  arrivesAt: Date;
  currency: string;
  basePriceCents: number;
  feesCents: number;
  carrier: CarrierSummary;
  origin: AirportSummary;
  destination: AirportSummary;
};

export type FlightSearchItem = FlightInstanceSummary & {
  availability: FlightAvailabilitySummary;
  requestedLegRange: FlightRequestedLegRange;
};

export type FlightSearchResult = {
  items: FlightSearchItem[];
  meta: PaginationMeta;
  inventoryModel: FlightInventoryModel;
};

export type FlightCabinAvailabilityItem = {
  id: string;
  cabinCode: string;
  fareClassCode: string;
  totalSeats: number;
  availableSeats: number;
  reservedSeats: number;
  soldSeats: number;
  priceCents: number;
  feesCents: number;
};

export type FlightInstanceDetail = FlightInstanceSummary & {
  legs: FlightLegSummary[];
};

export type FlightCabinAvailabilityResult = {
  flight: FlightInstanceDetail;
  requestedLegRange: FlightRequestedLegRange | null;
  items: FlightCabinAvailabilityItem[];
  meta: PaginationMeta;
  inventoryModel: FlightInventoryModel;
};
