export const BOOKING_DOMAINS = ['event', 'rail', 'air'] as const;

export type BookingDomain = (typeof BOOKING_DOMAINS)[number];

export type DomainMetadata = {
  key: BookingDomain;
  label: string;
  inventoryModel: string;
};

export const DOMAIN_METADATA: Record<BookingDomain, DomainMetadata> = {
  event: {
    key: 'event',
    label: 'Event Booking',
    inventoryModel: 'event_seat',
  },
  rail: {
    key: 'rail',
    label: 'Rail Booking',
    inventoryModel: 'trip_seat',
  },
  air: {
    key: 'air',
    label: 'Air Booking',
    inventoryModel: 'flight_seat',
  },
};

export const isBookingDomain = (
  value: string | undefined,
): value is BookingDomain =>
  value !== undefined && BOOKING_DOMAINS.includes(value as BookingDomain);
