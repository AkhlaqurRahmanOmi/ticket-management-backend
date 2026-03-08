-- CreateEnum
CREATE TYPE "TenantCustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateTable
CREATE TABLE "TenantCustomer" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "status" "TenantCustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantCustomer_orgId_status_createdAt_idx" ON "TenantCustomer"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TenantCustomer_email_idx" ON "TenantCustomer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TenantCustomer_orgId_email_key" ON "TenantCustomer"("orgId", "email");

-- AddForeignKey
ALTER TABLE "TenantCustomer" ADD CONSTRAINT "TenantCustomer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
