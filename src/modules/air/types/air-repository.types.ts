export type AirCountRow = {
  total: bigint | number | string;
};

export type FlightSearchRow = {
  id: string;
  flightNumber: string;
  title: string | null;
  status: string;
  departsAt: Date;
  arrivesAt: Date;
  currency: string;
  basePriceCents: number;
  feesCents: number;
  carrierId: string;
  carrierCode: string;
  carrierName: string;
  originId: string;
  originCode: string;
  originName: string;
  originCity: string | null;
  originCountry: string | null;
  destinationId: string;
  destinationCode: string;
  destinationName: string;
  destinationCity: string | null;
  destinationCountry: string | null;
  totalSeats: bigint | number | string;
  availableSeats: bigint | number | string;
  reservedSeats: bigint | number | string;
  soldSeats: bigint | number | string;
};

export type FlightAvailabilityRow = {
  id: string;
  cabinCode: string;
  fareClassCode: string;
  quantityTotal: number;
  quantityAvailable: number;
  quantityReserved: number;
  quantitySold: number;
  priceCents: number | null;
  feesCents: number | null;
  basePriceCents: number;
  baseFeesCents: number;
};

export type FlightSummaryRow = {
  id: string;
  flightNumber: string;
  title: string | null;
  status: string;
  departsAt: Date;
  arrivesAt: Date;
  currency: string;
  basePriceCents: number;
  feesCents: number;
  carrierId: string;
  carrierCode: string;
  carrierName: string;
  originId: string;
  originCode: string;
  originName: string;
  originCity: string | null;
  originCountry: string | null;
  destinationId: string;
  destinationCode: string;
  destinationName: string;
  destinationCity: string | null;
  destinationCountry: string | null;
};
