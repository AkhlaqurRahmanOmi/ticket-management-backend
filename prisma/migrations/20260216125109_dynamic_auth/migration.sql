/*
  Warnings:

  - The `globalRole` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `role` on the `OrganizationMember` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "OrganizationMember" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "globalRole",
ADD COLUMN     "globalRole" TEXT NOT NULL DEFAULT 'USER';

-- DropEnum
DROP TYPE "GlobalRole";

-- DropEnum
DROP TYPE "OrgRole";

-- CreateIndex
CREATE INDEX "OrganizationMember_orgId_role_idx" ON "OrganizationMember"("orgId", "role");

-- CreateIndex
CREATE INDEX "User_globalRole_idx" ON "User"("globalRole");
