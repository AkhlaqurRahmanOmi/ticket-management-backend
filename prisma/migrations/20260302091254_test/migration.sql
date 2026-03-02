-- AlterTable
ALTER TABLE "RailTrip" ADD COLUMN     "routeId" UUID;

-- CreateTable
CREATE TABLE "RailRoute" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "originStationId" UUID NOT NULL,
    "destinationStationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailRouteStop" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "scheduledArrivalOffset" INTEGER,
    "scheduledDepartureOffset" INTEGER,
    "isBoardingAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isDropAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailRouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailTripStop" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "routeStopId" UUID,
    "sequence" INTEGER NOT NULL,
    "arrivalAt" TIMESTAMP(3),
    "departureAt" TIMESTAMP(3),
    "isBoardingAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isDropAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RailTripStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RailRoute_orgId_idx" ON "RailRoute"("orgId");

-- CreateIndex
CREATE INDEX "RailRoute_originStationId_destinationStationId_idx" ON "RailRoute"("originStationId", "destinationStationId");

-- CreateIndex
CREATE UNIQUE INDEX "RailRoute_orgId_name_key" ON "RailRoute"("orgId", "name");

-- CreateIndex
CREATE INDEX "RailRouteStop_routeId_idx" ON "RailRouteStop"("routeId");

-- CreateIndex
CREATE INDEX "RailRouteStop_stationId_idx" ON "RailRouteStop"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "RailRouteStop_routeId_sequence_key" ON "RailRouteStop"("routeId", "sequence");

-- CreateIndex
CREATE INDEX "RailTripStop_tripId_idx" ON "RailTripStop"("tripId");

-- CreateIndex
CREATE INDEX "RailTripStop_stationId_idx" ON "RailTripStop"("stationId");

-- CreateIndex
CREATE INDEX "RailTripStop_routeStopId_idx" ON "RailTripStop"("routeStopId");

-- CreateIndex
CREATE UNIQUE INDEX "RailTripStop_tripId_sequence_key" ON "RailTripStop"("tripId", "sequence");

-- CreateIndex
CREATE INDEX "RailTrip_routeId_idx" ON "RailTrip"("routeId");

-- AddForeignKey
ALTER TABLE "RailRoute" ADD CONSTRAINT "RailRoute_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailRoute" ADD CONSTRAINT "RailRoute_originStationId_fkey" FOREIGN KEY ("originStationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailRoute" ADD CONSTRAINT "RailRoute_destinationStationId_fkey" FOREIGN KEY ("destinationStationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailRouteStop" ADD CONSTRAINT "RailRouteStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "RailRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailRouteStop" ADD CONSTRAINT "RailRouteStop_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTrip" ADD CONSTRAINT "RailTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "RailRoute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripStop" ADD CONSTRAINT "RailTripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "RailTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripStop" ADD CONSTRAINT "RailTripStop_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "RailStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailTripStop" ADD CONSTRAINT "RailTripStop_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "RailRouteStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;
