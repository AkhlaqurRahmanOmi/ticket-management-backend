import type { BookingDomain } from '@/generated/prisma/enums';
import type {
  FinalizePaymentSucceededInput,
  PaymentSucceededFinalizationResult,
} from '@/modules/payments/interface/booking-finalizer.interface';

export type IssuedDocumentKind =
  | 'EVENT_TICKET'
  | 'RAIL_TICKET'
  | 'AIR_TICKET'
  | 'PNR';

export type IssuedDocumentStatus = 'ISSUED' | 'VOIDED' | 'REFUNDED';

export type IssuedDocumentRecord = {
  id: string;
  domainType: BookingDomain;
  kind: IssuedDocumentKind;
  status: IssuedDocumentStatus;
  documentNumber: string;
  bookingId: string | null;
  orderId: string;
  ownerUserId: string;
  issuedAt: Date;
  metadata: {
    inventoryScopeId?: string;
    inventoryRefId?: string | null;
    categoryRefId?: string | null;
  };
};

export type IssueDocumentsInput = FinalizePaymentSucceededInput;

export type IssueDocumentsResult = PaymentSucceededFinalizationResult;

export type TicketIssuedDocumentRow = {
  id: string;
  domainType: BookingDomain;
  code: string;
  status: 'ISSUED' | 'VOIDED' | 'REFUNDED';
  issuedAt: Date;
  userId: string;
  eventId: string;
  orderId: string;
  eventSeatId: string | null;
  ticketTypeId: string | null;
  order: {
    payments: Array<{
      bookingId: string | null;
    }>;
  };
};
