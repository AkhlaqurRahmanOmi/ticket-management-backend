-- CreateTable
CREATE TABLE "RailSeatAllocation" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "bookingItemId" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "tripSeatId" UUID NOT NULL,
    "boardingTripStopId" UUID NOT NULL,
    "dropTripStopId" UUID NOT NULL,
    "boardingSequence" INTEGER NOT NULL,
    "dropSequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "RailSeatAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RailSeatAllocation_bookingId_idx" ON "RailSeatAllocation"("bookingId");

-- CreateIndex
CREATE INDEX "RailSeatAllocation_bookingItemId_idx" ON "RailSeatAllocation"("bookingItemId");

-- CreateIndex
CREATE INDEX "RailSeatAllocation_tripId_tripSeatId_idx" ON "RailSeatAllocation"("tripId", "tripSeatId");

-- CreateIndex
CREATE INDEX "RailSeatAllocation_tripSeatId_boardingSequence_dropSequence_idx" ON "RailSeatAllocation"("tripSeatId", "boardingSequence", "dropSequence");

-- CreateIndex
CREATE INDEX "RailSeatAllocation_releasedAt_idx" ON "RailSeatAllocation"("releasedAt");

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_bookingItemId_fkey" FOREIGN KEY ("bookingItemId") REFERENCES "BookingItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "RailTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_tripSeatId_fkey" FOREIGN KEY ("tripSeatId") REFERENCES "RailTripSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_boardingTripStopId_fkey" FOREIGN KEY ("boardingTripStopId") REFERENCES "RailTripStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeatAllocation" ADD CONSTRAINT "RailSeatAllocation_dropTripStopId_fkey" FOREIGN KEY ("dropTripStopId") REFERENCES "RailTripStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
