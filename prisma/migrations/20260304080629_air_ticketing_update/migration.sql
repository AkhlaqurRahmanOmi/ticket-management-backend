-- CreateTable
CREATE TABLE "AirIssuedDocument" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "flightInstanceId" UUID NOT NULL,
    "flightCabinInventoryId" UUID NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'ISSUED',
    "code" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voidedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AirIssuedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirIssuedDocument_code_key" ON "AirIssuedDocument"("code");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_bookingId_idx" ON "AirIssuedDocument"("bookingId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_bookingItemId_idx" ON "AirIssuedDocument"("bookingItemId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_paymentId_idx" ON "AirIssuedDocument"("paymentId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_userId_idx" ON "AirIssuedDocument"("userId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_flightInstanceId_idx" ON "AirIssuedDocument"("flightInstanceId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_flightCabinInventoryId_idx" ON "AirIssuedDocument"("flightCabinInventoryId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_issuedAt_idx" ON "AirIssuedDocument"("issuedAt");

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_flightInstanceId_fkey" FOREIGN KEY ("flightInstanceId") REFERENCES "FlightInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_flightCabinInventoryId_fkey" FOREIGN KEY ("flightCabinInventoryId") REFERENCES "FlightCabinInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
