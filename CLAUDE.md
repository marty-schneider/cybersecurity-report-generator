# Cybersecurity Report Generator

## Tech Stack
- **Server**: Express + TypeScript + Prisma (PostgreSQL) + Anthropic Claude API
- **Client**: React 18 + TypeScript + Vite + TailwindCSS + Zustand + Recharts + Lucide icons
- **Auth**: JWT (7-day expiry) + bcrypt
- **AI**: Claude Sonnet for analysis/reports, Claude Haiku for IOC enrichment

## Current State
- 5 assessment types (Pentest, Vuln Assessment, Security Audit, Red Team, Incident Response)
- Full CRUD for Projects, Findings, IOCs
- AI-powered IOC→TTP analysis (MITRE ATT&CK mapping)
- AI-powered report generation with 7 control domains, 20+ sub-controls
- CSV import with AI column mapping
- Professional HTML report with print-to-PDF
- Team collaboration (OWNER/EDITOR/VIEWER)
- Toast notifications, rate limiting, JWT auth
- Audit logging across all mutations (fire-and-forget)
- Remediation tracking with 7-status lifecycle, notes, date tracking
- Evidence & attachment management (Multer uploads, drag-and-drop)
- Finding templates library (50 built-in OWASP/network/cloud templates)
- CVE lookup & auto-enrichment via NVD API
- Dashboard analytics (7 Recharts visualizations including MITRE heatmap)
- Compliance framework mapping (NIST 800-53, PCI DSS 4.0, ISO 27001)
- Multi-format export (CSV, JSON, HTML, DOCX)
- Client portal with token-based report sharing (password, expiry, view limits)
- In-app notification system with bell icon and 30s polling

## Testing
- **Framework**: Vitest for both server (Node) and client (jsdom)
- **Run**: `npm test` (root), `npm run test:server`, `npm run test:client`
- **Server** (14 files, 100 tests): utils, middleware, services, controllers
- **Client** (3 files, 14 tests): Zustand stores
- **Infrastructure**: `server/src/__mocks__/prisma.ts` (shared Prisma mock), `server/src/__tests__/helpers/express.ts` (req/res/next factories), `server/src/__tests__/setup.ts` (global mock wiring)
- **Config**: `server/vitest.config.ts`, `client/vitest.config.ts`
- Test files excluded from `tsc` build via `server/tsconfig.json` exclude array

## Existing Patterns

**Server controller** (`server/src/controllers/`):
```
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { ProjectRequest, verifyProjectAccess, verifyResourceAccess } from '../middleware/projectAccess.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
→ async (req, res, next) => { try { ... } catch (error) { next(error) } }
```

**Server route** (`server/src/routes/`):
```
Router() → router.use(authenticate) → REST endpoints → export default router
Mounted in server/src/index.ts with rate limiter
```

**Client page** (`client/src/pages/`):
```
useState + useEffect + Promise.all() for parallel fetches
notify.success/error from store/notificationStore.ts
Services from client/src/services/ (thin axios wrappers)
Types from client/src/types/index.ts
```

**Critical shared files** (modified by most features):
- `server/prisma/schema.prisma` — all features add models/enums here
- `server/src/index.ts` — all features mount routes here
- `server/src/controllers/findingController.ts` — most features touch this
- `client/src/types/index.ts` — all features add interfaces here
- `server/src/templates/report.hbs` — report-impacting features add sections here

---

# Feature Roadmap

## Implementation Status (all complete)

| # | Feature | Status | Key Files |
|---|---------|--------|-----------|
| 1 | Audit Log | Done | `auditService.ts`, `auditController.ts`, `AuditLogTable.tsx` |
| 2 | Remediation Tracking | Done | `remediationController.ts`, `RemediationPanel.tsx`, `RemediationDashboard.tsx` |
| 3 | Evidence & Attachments | Done | `attachmentController.ts`, `upload.ts` (Multer), `AttachmentUploader.tsx` |
| 4 | Finding Templates | Done | `findingTemplateController.ts`, `seed-templates.ts`, `TemplatePickerModal.tsx` |
| 5 | CVE Lookup & Enrichment | Done | `cveService.ts`, `cveController.ts`, `CVEInfoCard.tsx` |
| 6 | Dashboard Analytics | Done | `analyticsController.ts`, 5 chart components in `dashboard/` |
| 7 | Compliance Mapping | Done | `complianceController.ts`, `seed-compliance.ts`, `ComplianceDashboard.tsx` |
| 8 | Export Improvements | Done | `csvExportService.ts`, `docxExportService.ts`, `exportController.ts`, `ExportMenu.tsx` |
| 9 | Client Portal / Sharing | Done | `shareController.ts`, `ShareModal.tsx`, `SharedReportViewer.tsx` |
| 10 | Notification System | Done | `notificationService.ts`, `notificationController.ts`, `NotificationBell.tsx` |

## API Routes

All routes mounted in `server/src/index.ts` with rate limiters:

| Prefix | Route File | Limiter | Auth |
|--------|-----------|---------|------|
| `/api/auth` | `authRoutes.ts` | authLimiter | Public |
| `/api/projects` | `projectRoutes.ts` | apiLimiter | JWT |
| `/api/findings` | `findingRoutes.ts` | apiLimiter | JWT |
| `/api/iocs` | `iocRoutes.ts` | apiLimiter | JWT |
| `/api/ttps` | `ttpRoutes.ts` | aiLimiter | JWT |
| `/api/reports` | `reportRoutes.ts` | aiLimiter | JWT |
| `/api/audit` | `auditRoutes.ts` | apiLimiter | JWT |
| `/api/remediation` | `remediationRoutes.ts` | apiLimiter | JWT |
| `/api/attachments` | `attachmentRoutes.ts` | apiLimiter | JWT |
| `/api/finding-templates` | `findingTemplateRoutes.ts` | apiLimiter | JWT |
| `/api/cve` | `cveRoutes.ts` | apiLimiter | JWT |
| `/api/analytics` | `analyticsRoutes.ts` | apiLimiter | JWT |
| `/api/compliance` | `complianceRoutes.ts` | apiLimiter | JWT |
| `/api/export` | `exportRoutes.ts` | aiLimiter | JWT |
| `/api/share` | `shareRoutes.ts` | apiLimiter | Mixed (public view + JWT management) |
| `/api/notifications` | `notificationRoutes.ts` | apiLimiter | JWT |

## Key Design Patterns
- **Fire-and-forget**: `auditService.log()` and `notificationService.create()` — `.catch()` only, never awaited
- **`verifyProjectAccess(req, mode)`**: Extracts projectId from `req.params.projectId` → `req.query.projectId` → `req.body.projectId`
- **`verifyResourceAccess(userId, resourceId, model, mode)`**: Generic resource access with nested project filter
- **Rate limiting**: 3 tiers — `apiLimiter` (100/15min), `aiLimiter` (10/hr), `authLimiter` (20/15min)

## Verification
1. `npm run build` — zero TypeScript errors (server + client)
2. `npm test` — 114 tests passing (100 server + 14 client)
3. `npx prisma migrate dev` — all 9 migrations applied
