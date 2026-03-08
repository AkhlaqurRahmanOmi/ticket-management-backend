-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "orgId" UUID;

-- AlterTable
ALTER TABLE "RailIssuedDocument" ADD COLUMN     "orgId" UUID;

-- CreateIndex
CREATE INDEX "Payment_orgId_idx" ON "Payment"("orgId");

-- CreateIndex
CREATE INDEX "Payment_orgId_status_createdAt_idx" ON "Payment"("orgId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_orgId_idx" ON "RailIssuedDocument"("orgId");

-- CreateIndex
CREATE INDEX "RailIssuedDocument_orgId_issuedAt_idx" ON "RailIssuedDocument"("orgId", "issuedAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RailIssuedDocument" ADD CONSTRAINT "RailIssuedDocument_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
