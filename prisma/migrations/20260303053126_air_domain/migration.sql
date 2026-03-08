-- CreateEnum
CREATE TYPE "FlightInstanceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Airport" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Airport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Carrier" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightService" (
    "id" UUID NOT NULL,
    "carrierId" UUID NOT NULL,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightInstance" (
    "id" UUID NOT NULL,
    "flightServiceId" UUID NOT NULL,
    "originAirportId" UUID NOT NULL,
    "destinationAirportId" UUID NOT NULL,
    "departsAt" TIMESTAMP(3) NOT NULL,
    "arrivesAt" TIMESTAMP(3) NOT NULL,
    "status" "FlightInstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "basePriceCents" INTEGER NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlightCabinInventory" (
    "id" UUID NOT NULL,
    "flightInstanceId" UUID NOT NULL,
    "cabinCode" TEXT NOT NULL,
    "fareClassCode" TEXT NOT NULL DEFAULT 'STANDARD',
    "quantityTotal" INTEGER NOT NULL,
    "quantityAvailable" INTEGER NOT NULL,
    "quantityReserved" INTEGER NOT NULL DEFAULT 0,
    "quantitySold" INTEGER NOT NULL DEFAULT 0,
    "priceCents" INTEGER,
    "feesCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlightCabinInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Airport_code_key" ON "Airport"("code");

-- CreateIndex
CREATE INDEX "Airport_name_idx" ON "Airport"("name");

-- CreateIndex
CREATE INDEX "Airport_city_idx" ON "Airport"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Carrier_code_key" ON "Carrier"("code");

-- CreateIndex
CREATE INDEX "Carrier_name_idx" ON "Carrier"("name");

-- CreateIndex
CREATE INDEX "FlightService_originAirportId_destinationAirportId_idx" ON "FlightService"("originAirportId", "destinationAirportId");

-- CreateIndex
CREATE UNIQUE INDEX "FlightService_carrierId_flightNumber_key" ON "FlightService"("carrierId", "flightNumber");

-- CreateIndex
CREATE INDEX "FlightInstance_flightServiceId_idx" ON "FlightInstance"("flightServiceId");

-- CreateIndex
CREATE INDEX "FlightInstance_status_departsAt_idx" ON "FlightInstance"("status", "departsAt");

-- CreateIndex
CREATE INDEX "FlightInstance_originAirportId_destinationAirportId_departs_idx" ON "FlightInstance"("originAirportId", "destinationAirportId", "departsAt");

-- CreateIndex
CREATE INDEX "FlightCabinInventory_flightInstanceId_idx" ON "FlightCabinInventory"("flightInstanceId");

-- CreateIndex
CREATE INDEX "FlightCabinInventory_flightInstanceId_cabinCode_idx" ON "FlightCabinInventory"("flightInstanceId", "cabinCode");

-- CreateIndex
CREATE UNIQUE INDEX "FlightCabinInventory_flightInstanceId_cabinCode_fareClassCo_key" ON "FlightCabinInventory"("flightInstanceId", "cabinCode", "fareClassCode");

-- AddForeignKey
ALTER TABLE "FlightService" ADD CONSTRAINT "FlightService_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightService" ADD CONSTRAINT "FlightService_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightService" ADD CONSTRAINT "FlightService_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightInstance" ADD CONSTRAINT "FlightInstance_flightServiceId_fkey" FOREIGN KEY ("flightServiceId") REFERENCES "FlightService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightInstance" ADD CONSTRAINT "FlightInstance_originAirportId_fkey" FOREIGN KEY ("originAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightInstance" ADD CONSTRAINT "FlightInstance_destinationAirportId_fkey" FOREIGN KEY ("destinationAirportId") REFERENCES "Airport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightCabinInventory" ADD CONSTRAINT "FlightCabinInventory_flightInstanceId_fkey" FOREIGN KEY ("flightInstanceId") REFERENCES "FlightInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
