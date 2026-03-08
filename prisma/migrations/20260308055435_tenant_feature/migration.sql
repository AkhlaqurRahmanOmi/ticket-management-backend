-- CreateEnum
CREATE TYPE "TenantDomainSubscriptionStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "TenantDomainSubscription" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "domain" "BookingDomain" NOT NULL,
    "status" "TenantDomainSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),

    CONSTRAINT "TenantDomainSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantDomainSubscription_orgId_status_idx" ON "TenantDomainSubscription"("orgId", "status");

-- CreateIndex
CREATE INDEX "TenantDomainSubscription_domain_status_idx" ON "TenantDomainSubscription"("domain", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TenantDomainSubscription_orgId_domain_key" ON "TenantDomainSubscription"("orgId", "domain");

-- AddForeignKey
ALTER TABLE "TenantDomainSubscription" ADD CONSTRAINT "TenantDomainSubscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
