-- CreateEnum
CREATE TYPE "BookingDomain" AS ENUM ('EVENT', 'RAIL', 'AIR');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "domainType" "BookingDomain" NOT NULL DEFAULT 'EVENT';

-- AlterTable
ALTER TABLE "OutboxEvent" ADD COLUMN     "domainType" "BookingDomain";

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "domainType" "BookingDomain" NOT NULL DEFAULT 'EVENT';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "domainType" "BookingDomain" NOT NULL DEFAULT 'EVENT';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "domainType" "BookingDomain" NOT NULL DEFAULT 'EVENT';

-- CreateIndex
CREATE INDEX "Order_domainType_status_createdAt_idx" ON "Order"("domainType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_domainType_status_availableAt_idx" ON "OutboxEvent"("domainType", "status", "availableAt");

-- CreateIndex
CREATE INDEX "Payment_domainType_status_createdAt_idx" ON "Payment"("domainType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Reservation_domainType_status_expiresAt_idx" ON "Reservation"("domainType", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "Ticket_domainType_issuedAt_idx" ON "Ticket"("domainType", "issuedAt");
