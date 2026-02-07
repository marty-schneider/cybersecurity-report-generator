-- CreateTable
CREATE TABLE "finding_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "cvssScore" DOUBLE PRECISION,
    "category" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "references" TEXT[],
    "tags" TEXT[],
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finding_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finding_templates_category_idx" ON "finding_templates"("category");

-- CreateIndex
CREATE INDEX "finding_templates_severity_idx" ON "finding_templates"("severity");

-- AddForeignKey
ALTER TABLE "finding_templates" ADD CONSTRAINT "finding_templates_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
