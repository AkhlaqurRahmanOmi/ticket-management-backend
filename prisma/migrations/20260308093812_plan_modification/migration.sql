-- AlterTable
ALTER TABLE "AirIssuedDocument" ADD COLUMN     "orgId" UUID;

-- AlterTable
ALTER TABLE "FlightInstance" ADD COLUMN     "orgId" UUID;

-- AlterTable
ALTER TABLE "FlightService" ADD COLUMN     "orgId" UUID;

-- CreateIndex
CREATE INDEX "AirIssuedDocument_orgId_idx" ON "AirIssuedDocument"("orgId");

-- CreateIndex
CREATE INDEX "AirIssuedDocument_orgId_issuedAt_idx" ON "AirIssuedDocument"("orgId", "issuedAt");

-- CreateIndex
CREATE INDEX "FlightInstance_orgId_idx" ON "FlightInstance"("orgId");

-- CreateIndex
CREATE INDEX "FlightInstance_orgId_status_departsAt_idx" ON "FlightInstance"("orgId", "status", "departsAt");

-- CreateIndex
CREATE INDEX "FlightInstance_orgId_originAirportId_destinationAirportId_d_idx" ON "FlightInstance"("orgId", "originAirportId", "destinationAirportId", "departsAt");

-- CreateIndex
CREATE INDEX "FlightService_orgId_idx" ON "FlightService"("orgId");

-- CreateIndex
CREATE INDEX "FlightService_orgId_flightNumber_idx" ON "FlightService"("orgId", "flightNumber");

-- AddForeignKey
ALTER TABLE "FlightService" ADD CONSTRAINT "FlightService_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlightInstance" ADD CONSTRAINT "FlightInstance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AirIssuedDocument" ADD CONSTRAINT "AirIssuedDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
