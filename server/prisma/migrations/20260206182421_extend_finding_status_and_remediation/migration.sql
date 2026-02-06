-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FindingStatus" ADD VALUE 'REMEDIATION_PLANNED';
ALTER TYPE "FindingStatus" ADD VALUE 'RETEST_PENDING';
ALTER TYPE "FindingStatus" ADD VALUE 'REMEDIATED';
ALTER TYPE "FindingStatus" ADD VALUE 'ACCEPTED_RISK';

-- AlterTable
ALTER TABLE "findings" ADD COLUMN     "remediationAssignedDate" TIMESTAMP(3),
ADD COLUMN     "remediationTargetDate" TIMESTAMP(3),
ADD COLUMN     "retestDate" TIMESTAMP(3),
ADD COLUMN     "riskAcceptanceNote" TEXT,
ADD COLUMN     "verifiedDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "remediation_notes" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remediation_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "remediation_notes_findingId_idx" ON "remediation_notes"("findingId");

-- AddForeignKey
ALTER TABLE "remediation_notes" ADD CONSTRAINT "remediation_notes_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_notes" ADD CONSTRAINT "remediation_notes_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
