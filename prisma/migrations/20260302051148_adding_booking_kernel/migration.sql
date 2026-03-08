-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingItemStatus" AS ENUM ('HOLD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PassengerType" AS ENUM ('ADULT', 'CHILD', 'INFANT');

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orgId" UUID,
    "domainType" "BookingDomain" NOT NULL DEFAULT 'EVENT',
    "status" "BookingStatus" NOT NULL DEFAULT 'HOLD',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "holdExpiresAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "type" "PassengerType" NOT NULL DEFAULT 'ADULT',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "documentType" TEXT,
    "documentNumber" TEXT,
    "nationality" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "passengerId" UUID,
    "status" "BookingItemStatus" NOT NULL DEFAULT 'HOLD',
    "inventoryType" TEXT NOT NULL,
    "inventoryRefId" TEXT NOT NULL,
    "segmentRefId" TEXT,
    "seatLabel" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "snapshot" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "BookingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_orgId_idx" ON "Booking"("orgId");

-- CreateIndex
CREATE INDEX "Booking_userId_status_createdAt_idx" ON "Booking"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_holdExpiresAt_idx" ON "Booking"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "Booking_domainType_status_createdAt_idx" ON "Booking"("domainType", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_userId_domainType_idempotencyKey_key" ON "Booking"("userId", "domainType", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Passenger_bookingId_idx" ON "Passenger"("bookingId");

-- CreateIndex
CREATE INDEX "Passenger_type_idx" ON "Passenger"("type");

-- CreateIndex
CREATE INDEX "Passenger_lastName_firstName_idx" ON "Passenger"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");

-- CreateIndex
CREATE INDEX "BookingItem_passengerId_idx" ON "BookingItem"("passengerId");

-- CreateIndex
CREATE INDEX "BookingItem_status_createdAt_idx" ON "BookingItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingItem_inventoryType_inventoryRefId_idx" ON "BookingItem"("inventoryType", "inventoryRefId");

-- CreateIndex
CREATE INDEX "BookingItem_segmentRefId_idx" ON "BookingItem"("segmentRefId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingItem" ADD CONSTRAINT "BookingItem_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
