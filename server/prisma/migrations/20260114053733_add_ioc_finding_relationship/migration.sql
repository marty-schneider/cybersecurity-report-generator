-- AlterTable
ALTER TABLE "findings" ADD COLUMN "cveIdentifier" TEXT,
ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "userModified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ioc_findings" (
    "id" TEXT NOT NULL,
    "iocId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "relevance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ioc_findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ioc_findings_iocId_findingId_key" ON "ioc_findings"("iocId", "findingId");

-- AddForeignKey
ALTER TABLE "ioc_findings" ADD CONSTRAINT "ioc_findings_iocId_fkey" FOREIGN KEY ("iocId") REFERENCES "iocs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ioc_findings" ADD CONSTRAINT "ioc_findings_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
