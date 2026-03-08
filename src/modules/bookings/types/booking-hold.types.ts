export type BookingHoldItemRecord = {
  eventSeatId: string | null;
  quantity: number;
  priceCents: number;
  feesCents: number;
};

export type BookingHoldRecord = {
  id: string;
  bookingId: string;
  eventId: string;
  userId: string;
  status: string;
  expiresAt: Date;
  idempotencyKey: string;
  createdAt: Date;
  items: BookingHoldItemRecord[];
};

export type CreateSeatHoldInput = {
  userId: string;
  eventId: string;
  eventSeatId: string;
  idempotencyKey: string;
  ttlMinutes: number;
  correlationId: string;
};

export type SeatHoldInput = Omit<
  CreateSeatHoldInput,
  'userId' | 'ttlMinutes' | 'correlationId'
>;

export type CreateSeatHoldResult = {
  hold: BookingHoldRecord;
  correlationId: string;
  resolution: 'created' | 'existing' | 'recovered';
};

export type ExpireBookingHoldResult = {
  updated: boolean;
  reservationId: string;
  inventoryScopeId: string;
  releasedInventoryRefIds: string[];
};
