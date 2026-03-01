export type LogContextInput = {
  module?: string;
  action?: string;
  correlationId?: string;
  eventId?: string;
  reservationId?: string;
  paymentId?: string;
  ticketId?: string;
  userId?: string;
  provider?: string;
  providerEventId?: string;
  attempts?: number;
  partition?: number;
  offset?: string;
  meta?: Record<string, unknown>;
};

export function buildLogContext(input: LogContextInput): Record<string, unknown> {
  const filteredEntries = Object.entries(input).filter(([, value]) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 0;
    }

    return true;
  });

  return Object.fromEntries(filteredEntries);
}
