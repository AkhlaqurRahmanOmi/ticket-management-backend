-- CreateEnum
CREATE TYPE "RailTripStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "RailStation" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailTrip" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "originStationId" UUID NOT NULL,
    "destinationStationId" UUID NOT NULL,
    "tripNumber" TEXT NOT NULL,
    "title" TEXT,
    "departsAt" TIMESTAMP(3) NOT NULL,
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "status" "RailTripStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "basePriceCents" INTEGER NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailCoach" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "seatClass" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailSeat" (
    "id" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "seatNumber" TEXT NOT NULL,
    "label" TEXT,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailTripSeat" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "coachId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "status" "SeatInventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "reservedUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "feesCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailTripSeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RailStation_code_key" ON "RailStation"("code");

-- CreateIndex
CREATE INDEX "RailStation_name_idx" ON "RailStation"("name");

-- CreateIndex
CREATE INDEX "RailStation_city_idx" ON "RailStation"("city");

-- CreateIndex
CREATE INDEX "RailTrip_orgId_idx" ON "RailTrip"("orgId");

-- CreateIndex
CREATE INDEX "RailTrip_status_departsAt_idx" ON "RailTrip"("status", "departsAt");

-- CreateIndex
CREATE INDEX "RailTrip_originStationId_destinationStationId_departsAt_idx" ON "RailTrip"("originStationId", "destinationStationId", "departsAt");

-- CreateIndex
CREATE INDEX "RailTrip_orgId_status_departsAt_idx" ON "RailTrip"("orgId", "status", "departsAt");

-- CreateIndex
CREATE INDEX "RailCoach_tripId_sortOrder_idx" ON "RailCoach"("tripId", "sortOrder");

-- CreateIndex
CREATE INDEX "RailCoach_tripId_seatClass_idx" ON "RailCoach"("tripId", "seatClass");

-- CreateIndex
CREATE UNIQUE INDEX "RailCoach_tripId_code_key" ON "RailCoach"("tripId", "code");

-- CreateIndex
CREATE INDEX "RailSeat_coachId_seatNumber_idx" ON "RailSeat"("coachId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RailSeat_coachId_code_key" ON "RailSeat"("coachId", "code");

-- CreateIndex
CREATE INDEX "RailTripSeat_tripId_status_idx" ON "RailTripSeat"("tripId", "status");

-- CreateIndex
CREATE INDEX "RailTripSeat_coachId_status_idx" ON "RailTripSeat"("coachId", "status");

-- CreateIndex
CREATE INDEX "RailTripSeat_reservedUntil_idx" ON "RailTripSeat"("reservedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "RailTripSeat_tripId_seatId_key" ON "RailTripSeat"("tripId", "seatId");

-- AddForeignKey
ALTER TABLE "RailTrip" ADD CONSTRAINT "RailTrip_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTrip" ADD CONSTRAINT "RailTrip_originStationId_fkey" FOREIGN KEY ("originStationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTrip" ADD CONSTRAINT "RailTrip_destinationStationId_fkey" FOREIGN KEY ("destinationStationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailCoach" ADD CONSTRAINT "RailCoach_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "RailTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailSeat" ADD CONSTRAINT "RailSeat_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RailCoach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripSeat" ADD CONSTRAINT "RailTripSeat_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "RailTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripSeat" ADD CONSTRAINT "RailTripSeat_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "RailCoach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripSeat" ADD CONSTRAINT "RailTripSeat_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "RailSeat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
