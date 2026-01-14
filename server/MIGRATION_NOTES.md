# Prisma Schema Migration - IOC-Finding Relationships

## Completed Changes

### 1. Schema Updates (`/server/prisma/schema.prisma`)

#### Finding Model Enhancements
Added the following fields to track AI-generated content and CVE identifiers:
- `cveIdentifier` (String?, optional) - Line 74
- `aiGenerated` (Boolean, default: false) - Line 79
- `userModified` (Boolean, default: false) - Line 80
- `linkedIOCs` (IOCFinding[] relation) - Line 85

#### IOC Model Enhancement
Added relationship field:
- `linkedFindings` (IOCFinding[] relation) - Line 108

#### New IOCFinding Junction Table
Created new model for many-to-many relationship between IOCs and Findings:
- `id` (String, UUID primary key)
- `iocId` (String, foreign key to IOC)
- `findingId` (String, foreign key to Finding)
- `relevance` (String?, Text field for describing the relationship)
- `createdAt` (DateTime, auto-generated)
- Unique constraint on `[iocId, findingId]` to prevent duplicates
- Cascade delete on both foreign keys

### 2. Migration Files Created

Created migration: `20260114053733_add_ioc_finding_relationship`

**Location:** `/server/prisma/migrations/20260114053733_add_ioc_finding_relationship/migration.sql`

**SQL Changes:**
- Adds 3 new columns to `findings` table
- Creates new `ioc_findings` junction table
- Adds unique index on IOC-Finding pairs
- Sets up foreign key constraints with CASCADE delete

**Migration Lock:** `/server/prisma/migrations/migration_lock.toml` (PostgreSQL)

## Next Steps (When Network Access is Available)

Due to network restrictions preventing Prisma engine downloads, the following commands need to be executed when the environment has internet access:

### 1. Generate Prisma Client
```bash
cd /home/user/cybersecurity-report-generator/server
npx prisma generate
```

This will:
- Download required Prisma query engine
- Generate TypeScript types for the new schema
- Update the Prisma Client with new models and relationships

### 2. Apply Migration to Database
```bash
cd /home/user/cybersecurity-report-generator/server
npx prisma migrate deploy
```

Or for development:
```bash
npx prisma migrate dev
```

This will execute the migration SQL against your PostgreSQL database.

### 3. Verify Migration
```bash
npx prisma migrate status
```

## Database Schema Changes Summary

### New Table: `ioc_findings`
```sql
CREATE TABLE "ioc_findings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "iocId" TEXT NOT NULL REFERENCES "iocs"("id") ON DELETE CASCADE,
    "findingId" TEXT NOT NULL REFERENCES "findings"("id") ON DELETE CASCADE,
    "relevance" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("iocId", "findingId")
);
```

### Modified Table: `findings`
```sql
ALTER TABLE "findings"
    ADD COLUMN "cveIdentifier" TEXT,
    ADD COLUMN "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "userModified" BOOLEAN NOT NULL DEFAULT false;
```

## Usage Examples

### TypeScript/JavaScript (after running prisma generate)

#### Creating IOC-Finding relationships:
```typescript
// Link an IOC to a Finding
await prisma.iOCFinding.create({
  data: {
    iocId: 'ioc-uuid',
    findingId: 'finding-uuid',
    relevance: 'This IP address was found in the network traffic during the attack'
  }
});

// Query Finding with linked IOCs
const finding = await prisma.finding.findUnique({
  where: { id: 'finding-uuid' },
  include: {
    linkedIOCs: {
      include: {
        ioc: true
      }
    }
  }
});

// Query IOC with linked Findings
const ioc = await prisma.iOC.findUnique({
  where: { id: 'ioc-uuid' },
  include: {
    linkedFindings: {
      include: {
        finding: true
      }
    }
  }
});

// Create AI-generated finding
await prisma.finding.create({
  data: {
    projectId: 'project-uuid',
    title: 'SQL Injection Vulnerability',
    description: '...',
    severity: 'HIGH',
    cveIdentifier: 'CVE-2023-12345',
    aiGenerated: true,
    userModified: false,
    remediation: '...'
  }
});
```

## Troubleshooting

### If migration fails:
1. Check DATABASE_URL in `.env` file
2. Ensure PostgreSQL is running and accessible
3. Verify database exists: `cyberreport`
4. Check database user permissions

### To reset migrations (CAUTION - destroys data):
```bash
npx prisma migrate reset
```

### To view current database state:
```bash
npx prisma studio
```
