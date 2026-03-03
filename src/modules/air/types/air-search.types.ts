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
};

export type FlightSearchResult = {
  items: FlightSearchItem[];
  meta: PaginationMeta;
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

export type FlightCabinAvailabilityResult = {
  flight: FlightInstanceSummary;
  items: FlightCabinAvailabilityItem[];
  meta: PaginationMeta;
};
