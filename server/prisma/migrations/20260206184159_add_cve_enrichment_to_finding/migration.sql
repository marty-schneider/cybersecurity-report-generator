-- AlterTable
ALTER TABLE "findings" ADD COLUMN     "cveData" JSONB,
ADD COLUMN     "cveEnrichedAt" TIMESTAMP(3),
ADD COLUMN     "cveId" TEXT;
