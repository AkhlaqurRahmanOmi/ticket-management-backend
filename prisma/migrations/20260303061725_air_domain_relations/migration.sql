-- CreateTable
CREATE TABLE "FlightServiceLeg" (
    "id" UUID NOT NULL,
    "flightServiceId" UUID NOT NULL,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightServiceLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightLegInstance" (
    "id" UUID NOT NULL,
    "flightInstanceId" UUID NOT NULL,
    "flightServiceLegId" UUID,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "departsAt" TIMESTAMP(3) NOT NULL,
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightLegInstance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlightServiceLeg_flightServiceId_idx" ON "FlightServiceLeg"("flightServiceId");

-- CreateIndex
CREATE INDEX "FlightServiceLeg_originAirportId_destinationAirportId_idx" ON "FlightServiceLeg"("originAirportId", "destinationAirportId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightServiceLeg_flightServiceId_sequence_key" ON "FlightServiceLeg"("flightServiceId", "sequence");

-- CreateIndex
CREATE INDEX "FlightLegInstance_flightInstanceId_idx" ON "FlightLegInstance"("flightInstanceId");

-- CreateIndex
CREATE INDEX "FlightLegInstance_flightServiceLegId_idx" ON "FlightLegInstance"("flightServiceLegId");

-- CreateIndex
CREATE INDEX "FlightLegInstance_originAirportId_destinationAirportId_idx" ON "FlightLegInstance"("originAirportId", "destinationAirportId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightLegInstance_flightInstanceId_sequence_key" ON "FlightLegInstance"("flightInstanceId", "sequence");

-- AddForeignKey
ALTER TABLE "FlightServiceLeg" ADD CONSTRAINT "FlightServiceLeg_flightServiceId_fkey" FOREIGN KEY ("flightServiceId") REFERENCES "FlightService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightServiceLeg" ADD CONSTRAINT "FlightServiceLeg_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightServiceLeg" ADD CONSTRAINT "FlightServiceLeg_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLegInstance" ADD CONSTRAINT "FlightLegInstance_flightInstanceId_fkey" FOREIGN KEY ("flightInstanceId") REFERENCES "FlightInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLegInstance" ADD CONSTRAINT "FlightLegInstance_flightServiceLegId_fkey" FOREIGN KEY ("flightServiceLegId") REFERENCES "FlightServiceLeg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLegInstance" ADD CONSTRAINT "FlightLegInstance_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightLegInstance" ADD CONSTRAINT "FlightLegInstance_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
