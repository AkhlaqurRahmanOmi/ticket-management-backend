export type BookingPaymentItemRecord = {
  quantity: number;
  unitPriceCents: number;
  feesCents: number;
  inventoryType: string;
  inventoryRefId: string;
  seatLabel: string | null;
};

export type BookingPaymentTarget = {
  id: string;
  userId: string;
  status: string;
  holdExpiresAt: Date | null;
  currency: string;
  inventoryScopeId: string | null;
  legacyReservationId: string | null;
  items: BookingPaymentItemRecord[];
};
