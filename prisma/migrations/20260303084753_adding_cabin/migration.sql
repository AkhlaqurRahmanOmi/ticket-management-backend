-- CreateTable
CREATE TABLE "AirCabinAllocation" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "flightInstanceId" UUID NOT NULL,
    "flightCabinInventoryId" UUID NOT NULL,
    "originLegInstanceId" UUID,
    "destinationLegInstanceId" UUID,
    "originSequence" INTEGER NOT NULL,
    "destinationSequence" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "AirCabinAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AirCabinAllocation_bookingId_idx" ON "AirCabinAllocation"("bookingId");

-- CreateIndex
CREATE INDEX "AirCabinAllocation_bookingItemId_idx" ON "AirCabinAllocation"("bookingItemId");

-- CreateIndex
CREATE INDEX "AirCabinAllocation_flightInstanceId_flightCabinInventoryId_idx" ON "AirCabinAllocation"("flightInstanceId", "flightCabinInventoryId");

-- CreateIndex
CREATE INDEX "AirCabinAllocation_flightCabinInventoryId_originSequence_de_idx" ON "AirCabinAllocation"("flightCabinInventoryId", "originSequence", "destinationSequence");

-- CreateIndex
CREATE INDEX "AirCabinAllocation_releasedAt_idx" ON "AirCabinAllocation"("releasedAt");

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_flightInstanceId_fkey" FOREIGN KEY ("flightInstanceId") REFERENCES "FlightInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_flightCabinInventoryId_fkey" FOREIGN KEY ("flightCabinInventoryId") REFERENCES "FlightCabinInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_originLegInstanceId_fkey" FOREIGN KEY ("originLegInstanceId") REFERENCES "FlightLegInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirCabinAllocation" ADD CONSTRAINT "AirCabinAllocation_destinationLegInstanceId_fkey" FOREIGN KEY ("destinationLegInstanceId") REFERENCES "FlightLegInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
