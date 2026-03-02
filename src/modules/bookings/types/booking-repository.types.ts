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
  userId: string;
  status: string;
  holdExpiresAt: Date | null;
  currency: string;
  metadata: unknown;
  items: BookingPaymentTargetItemRow[];
};
