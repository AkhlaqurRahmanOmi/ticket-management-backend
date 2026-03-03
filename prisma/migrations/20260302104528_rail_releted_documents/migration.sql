-- CreateTable
CREATE TABLE "RailIssuedDocument" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "tripSeatId" UUID NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailIssuedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RailIssuedDocument_code_key" ON "RailIssuedDocument"("code");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_bookingId_idx" ON "RailIssuedDocument"("bookingId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_bookingItemId_idx" ON "RailIssuedDocument"("bookingItemId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_paymentId_idx" ON "RailIssuedDocument"("paymentId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_userId_idx" ON "RailIssuedDocument"("userId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_tripId_idx" ON "RailIssuedDocument"("tripId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_tripSeatId_idx" ON "RailIssuedDocument"("tripSeatId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_issuedAt_idx" ON "RailIssuedDocument"("issuedAt");

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "RailTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_tripSeatId_fkey" FOREIGN KEY ("tripSeatId") REFERENCES "RailTripSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
