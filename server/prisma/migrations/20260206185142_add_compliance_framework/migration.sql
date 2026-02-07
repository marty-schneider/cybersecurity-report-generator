-- CreateTable
CREATE TABLE "compliance_frameworks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_controls" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "controlId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "compliance_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finding_compliance_mappings" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "complianceControlId" TEXT NOT NULL,
    "isAISuggested" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "finding_compliance_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compliance_frameworks_shortCode_key" ON "compliance_frameworks"("shortCode");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_controls_frameworkId_controlId_key" ON "compliance_controls"("frameworkId", "controlId");

-- CreateIndex
CREATE UNIQUE INDEX "finding_compliance_mappings_findingId_complianceControlId_key" ON "finding_compliance_mappings"("findingId", "complianceControlId");

-- AddForeignKey
ALTER TABLE "compliance_controls" ADD CONSTRAINT "compliance_controls_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "compliance_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_compliance_mappings" ADD CONSTRAINT "finding_compliance_mappings_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finding_compliance_mappings" ADD CONSTRAINT "finding_compliance_mappings_complianceControlId_fkey" FOREIGN KEY ("complianceControlId") REFERENCES "compliance_controls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
