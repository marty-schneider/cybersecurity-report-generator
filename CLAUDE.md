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

## Recommended Implementation Order

| Phase | Feature | Complexity | Why This Order |
|-------|---------|------------|----------------|
| 1 | Audit Log | Medium | Foundation — all subsequent features get automatic logging |
| 2 | Remediation Tracking | Medium-Large | Extends core Finding model; later features depend on stable lifecycle |
| 3 | Evidence & Attachments | Medium | Also extends Finding; needed before report template changes |
| 4 | Finding Templates | Medium | Depends on stable Finding model |
| 5 | CVE Lookup & Enrichment | Medium | Enriches findings/IOCs independently |
| 6 | Dashboard Analytics | Medium | Read-only aggregation; benefits from richer data from 2-5 |
| 7 | Compliance Mapping | Large | Adds report appendix; depends on stable Finding model |
| 8 | Export Improvements | Large | Should come after report template changes from 2, 3, 7 |
| 9 | Client Portal / Sharing | Medium | Depends on export/report being finalized |
| 10 | Notification System | Medium-Large | Can notify about all previously implemented features |

---

## Feature 1: Audit Log

### Schema
```prisma
model AuditLog {
  id          String      @id @default(uuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  projectId   String?
  project     Project?    @relation(fields: [projectId], references: [id], onDelete: SetNull)
  action      AuditAction
  entityType  String          // "Finding", "IOC", "TTPMapping", "Project", "Report"
  entityId    String?
  details     Json?           // { before: {...}, after: {...} }
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime    @default(now())
  @@index([projectId, createdAt])
  @@index([userId, createdAt])
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  VIEW
  EXPORT
  SHARE
  LOGIN
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/auditService.ts` | `log({ userId, projectId?, action, entityType, entityId?, details? })` — fire-and-forget (no await), never blocks main request |
| Create | `controllers/auditController.ts` | `getProjectAuditLog(projectId, filters)`, `getUserAuditLog(userId)` (admin only) |
| Create | `routes/auditRoutes.ts` | `GET /project/:projectId`, `GET /user/:userId` |
| Modify | `index.ts` | Mount `/api/audit` with `apiLimiter` |
| Modify | `findingController.ts` | Add `auditService.log()` in create/update/delete |
| Modify | `iocController.ts` | Same |
| Modify | `projectController.ts` | Same |
| Modify | `reportController.ts` | Audit report generation |
| Modify | `ttpController.ts` | Audit TTP analysis |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/auditService.ts` | `getProjectLog(projectId, page, filters?)` |
| Create | `components/audit/AuditLogTable.tsx` | Paginated table with action/date/user filters |
| Create | `pages/ProjectAuditLog.tsx` | Full page view |
| Modify | `types/index.ts` | Add `AuditLog`, `AuditAction` types |
| Modify | `App.tsx` | Route `projects/:id/audit` |
| Modify | `pages/ProjectDetail.tsx` | "Audit Log" link |

### Dependencies: None
### Report impact: None

---

## Feature 2: Remediation Tracking & Retesting

### Schema
Extend `FindingStatus` enum:
```prisma
enum FindingStatus {
  NEW
  IN_REVIEW
  VERIFIED
  REMEDIATION_PLANNED    // NEW
  RETEST_PENDING         // NEW
  REMEDIATED             // NEW
  ACCEPTED_RISK          // NEW
  MITIGATED
}
```

Add fields to `Finding`:
```prisma
  remediationAssignedDate DateTime?
  remediationTargetDate   DateTime?
  retestDate              DateTime?
  verifiedDate            DateTime?
  riskAcceptanceNote      String?   @db.Text
```

New model:
```prisma
model RemediationNote {
  id        String   @id @default(uuid())
  findingId String
  finding   Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)
  note      String   @db.Text
  createdBy String
  author    User     @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  @@index([findingId])
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `controllers/remediationController.ts` | `updateRemediationStatus`, `addNote`, `getTimeline`, `getProjectDashboard` |
| Create | `routes/remediationRoutes.ts` | `PATCH /findings/:findingId/remediation`, `POST /findings/:findingId/notes`, `GET /projects/:projectId/remediation-dashboard` |
| Modify | `findingController.ts` | Validate new statuses (e.g., RETEST_PENDING requires retestDate, ACCEPTED_RISK requires note) |
| Modify | `index.ts` | Mount `/api/remediation` |
| Modify | `reportGenerationService.ts` | Include remediation dates/notes in report data |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/remediationService.ts` | `updateStatus`, `addNote`, `getDashboard` |
| Create | `components/finding/RemediationPanel.tsx` | Timeline, status dropdown, date pickers, notes thread |
| Create | `components/finding/RemediationDashboard.tsx` | Project-level: status pie chart, upcoming retests, overdue alerts (Recharts) |
| Modify | `types/index.ts` | Extend `FindingStatus`, add `RemediationNote`, new Finding fields |
| Modify | `components/badges.tsx` | Colors for new statuses |
| Modify | `pages/ProjectDetail.tsx` | Remediation tab per finding, dashboard link |

### Dependencies: None (date pickers via native HTML `<input type="date">` + date-fns already installed)
### Report impact: Add remediation status summary section + dates in finding details

---

## Feature 3: Evidence & Attachment Management

### Schema
```prisma
model Attachment {
  id          String   @id @default(uuid())
  findingId   String
  finding     Finding  @relation(fields: [findingId], references: [id], onDelete: Cascade)
  fileName    String
  fileType    String       // MIME type
  fileSize    Int          // bytes
  storagePath String       // disk path or S3 key
  caption     String?   @db.Text
  uploadedBy  String
  uploader    User      @relation(fields: [uploadedBy], references: [id])
  createdAt   DateTime  @default(now())
  @@index([findingId])
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `middleware/upload.ts` | Multer config: disk storage, file filter (images, pcap, txt, log, pdf), 10MB limit |
| Create | `controllers/attachmentController.ts` | `upload`, `get` (serves file), `delete`, `list` |
| Create | `routes/attachmentRoutes.ts` | `POST /:findingId/upload` (multer middleware), `GET /:id`, `DELETE /:id` |
| Modify | `index.ts` | Mount `/api/attachments`, add `express.static('uploads')` |
| Modify | `reportGenerationService.ts` | Include attachments, convert images to base64 for inline embedding |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/attachmentService.ts` | `upload(findingId, file, caption?)` with FormData, `getUrl(id)`, `delete(id)` |
| Create | `components/finding/AttachmentUploader.tsx` | Drag-and-drop + file input, upload progress |
| Create | `components/finding/AttachmentGallery.tsx` | Thumbnail grid, lightbox modal, file icon for non-images |
| Modify | `types/index.ts` | `Attachment` interface, `attachments?` on Finding |
| Modify | `pages/ProjectDetail.tsx` | Uploader + gallery in finding modal |

### Dependencies
- **Server**: `npm install multer @types/multer`
- **Client**: None (native HTML5 drag-and-drop)

### Report impact: Inline images in evidence sections, register `isImage` Handlebars helper

---

## Feature 4: Finding Templates Library

### Schema
```prisma
model FindingTemplate {
  id          String    @id @default(uuid())
  title       String
  description String    @db.Text
  severity    Severity
  cvssScore   Float?
  category    String        // "Web Application", "Network", "Authentication"
  remediation String    @db.Text
  references  String[]
  tags        String[]
  isBuiltIn   Boolean   @default(false)
  createdBy   String?
  creator     User?     @relation("createdTemplates", fields: [createdBy], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  @@index([category])
  @@index([severity])
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `controllers/findingTemplateController.ts` | `list` (search/filter), `get`, `create`, `update`, `delete`, `suggest` (AI) |
| Create | `routes/findingTemplateRoutes.ts` | Standard CRUD + `POST /suggest` |
| Create | `services/findingTemplateService.ts` | `suggestTemplates(iocs, ttps)` — Claude call to match against template categories |
| Create | `prisma/seed-templates.ts` | 30-50 built-in templates (OWASP Top 10, network vulns, cloud misconfig, etc.) |
| Modify | `index.ts` | Mount `/api/finding-templates` |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/findingTemplateService.ts` | `list(filters?)`, `suggest(projectId)` |
| Create | `components/finding/TemplatePickerModal.tsx` | Search, category/severity filters, template cards, "Use Template" button pre-fills form |
| Create | `components/finding/TemplateSuggestions.tsx` | AI suggestion panel |
| Modify | `types/index.ts` | `FindingTemplate` interface |
| Modify | `pages/ProjectDetail.tsx` | "Use Template" button next to "Add Finding" |

### Dependencies: None
### Report impact: None (templates affect creation, not rendering)

---

## Feature 5: CVE Lookup & Auto-Enrichment

### Schema
Add to `Finding`:
```prisma
  cveId           String?
  cveData         Json?       // cached NVD response
  cveEnrichedAt   DateTime?
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/cveService.ts` | `lookupCVE(cveId)` — NVD API v2 call, `enrichFinding(findingId)` — regex-detect CVE in title/description, fetch + update |
| Create | `controllers/cveController.ts` | `lookup`, `enrichFinding`, `enrichProject` (batch) |
| Create | `routes/cveRoutes.ts` | `GET /lookup?cveId=...`, `POST /enrich/finding/:id`, `POST /enrich/project/:id` |
| Modify | `findingController.ts` | Auto-trigger enrichment on create if CVE pattern detected |
| Modify | `iocController.ts` | Auto-enrich CVE-type IOCs |
| Modify | `index.ts` | Mount `/api/cve` |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/cveService.ts` | `lookup(cveId)`, `enrichFinding(id)`, `enrichProject(id)` |
| Create | `components/finding/CVEInfoCard.tsx` | CVE details: ID, CVSS badge, description, references, "Enrich" button |
| Modify | `types/index.ts` | `CVEData` interface, extend Finding |
| Modify | `pages/ProjectDetail.tsx` | CVE field in finding form, auto-populate CVSS, "Enrich All" button |

### Dependencies: None (NVD API is free, no key required; optional `NVD_API_KEY` in `.env` for higher rate limits)
### Report impact: CVE reference box per finding (`{{#if this.cveData}}`)

---

## Feature 6: Enhanced Dashboard Analytics

### Schema: None (aggregation queries on existing data)

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `controllers/analyticsController.ts` | `getOverviewStats`, `getSeverityDistribution`, `getFindingsOverTime(range)`, `getIOCTypeBreakdown`, `getMitreHeatmap`, `getRiskPosture` — all filtered by user's accessible projects |
| Create | `routes/analyticsRoutes.ts` | GET endpoints for each |
| Modify | `index.ts` | Mount `/api/analytics` |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/analyticsService.ts` | Thin wrappers for each endpoint |
| Create | `components/dashboard/SeverityDistributionChart.tsx` | Recharts PieChart/BarChart |
| Create | `components/dashboard/FindingsOverTimeChart.tsx` | Recharts AreaChart |
| Create | `components/dashboard/IOCTypeBreakdown.tsx` | Recharts BarChart |
| Create | `components/dashboard/MitreHeatmap.tsx` | Custom grid: tactic columns, technique cells colored by count |
| Create | `components/dashboard/RiskPostureChart.tsx` | Recharts stacked BarChart per project |
| Modify | `pages/Dashboard.tsx` | Add chart grid below existing stats cards, fetch with `Promise.all()` |
| Modify | `types/index.ts` | Analytics response types |

### Dependencies: None (Recharts + Lucide already installed)
### Report impact: None (dashboard-only)

---

## Feature 7: Compliance Framework Mapping

### Schema
```prisma
model ComplianceFramework {
  id        String   @id @default(uuid())
  name      String             // "PCI DSS 4.0"
  version   String
  shortCode String   @unique   // "PCI_DSS_4"
  controls  ComplianceControl[]
  createdAt DateTime @default(now())
}

model ComplianceControl {
  id            String              @id @default(uuid())
  frameworkId   String
  framework     ComplianceFramework @relation(fields: [frameworkId], references: [id], onDelete: Cascade)
  controlId     String              // "6.2.4"
  title         String
  description   String              @db.Text
  category      String?
  findingMappings FindingComplianceMapping[]
  @@unique([frameworkId, controlId])
}

model FindingComplianceMapping {
  id                  String            @id @default(uuid())
  findingId           String
  finding             Finding           @relation(fields: [findingId], references: [id], onDelete: Cascade)
  complianceControlId String
  complianceControl   ComplianceControl @relation(fields: [complianceControlId], references: [id], onDelete: Cascade)
  isAISuggested       Boolean  @default(false)
  confidence          Float?
  notes               String?  @db.Text
  @@unique([findingId, complianceControlId])
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `controllers/complianceController.ts` | `listFrameworks`, `getControls`, `mapFinding`, `unmapFinding`, `getProjectSummary`, `suggestMappings` (AI) |
| Create | `routes/complianceRoutes.ts` | CRUD + `POST /suggest/:findingId` |
| Create | `services/complianceService.ts` | `suggestMappings(finding, frameworks)` — Claude call |
| Create | `prisma/seed-compliance.ts` | Seed PCI DSS 4.0, ISO 27001, NIST 800-53 (focused subset ~50 controls each) |
| Modify | `index.ts` | Mount `/api/compliance` |
| Modify | `reportGenerationService.ts` | Include compliance matrix in template data |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/complianceService.ts` | All endpoints |
| Create | `components/compliance/ComplianceMappingPanel.tsx` | Per-finding: mapped controls as chips, "Add"/"Suggest" buttons |
| Create | `components/compliance/ComplianceDashboard.tsx` | Framework selector, control matrix, coverage % |
| Create | `components/compliance/ComplianceControlPicker.tsx` | Searchable modal with framework tabs |
| Modify | `types/index.ts` | Framework, Control, Mapping interfaces |
| Modify | `pages/ProjectDetail.tsx` | Compliance tags on findings, "Compliance" tab |

### Dependencies: None
### Report impact: New "Appendix D: Compliance Framework Mapping" section

---

## Feature 8: Export Improvements

### Schema
Extend `ExportFormat` enum: add `CSV`, `JSON`, `HTML`
Add to `Report`: `fileData Bytes?`, `fileName String?`

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/pdfExportService.ts` | Puppeteer: HTML → PDF buffer |
| Create | `services/docxExportService.ts` | `docx` package: structured DOCX from report data |
| Create | `services/csvExportService.ts` | Manual CSV builder for findings/IOCs |
| Create | `controllers/exportController.ts` | `exportPDF`, `exportDOCX`, `exportCSV`, `exportJSON` — respond with Content-Disposition headers |
| Create | `routes/exportRoutes.ts` | `GET /pdf/:projectId`, `GET /docx/:projectId`, `GET /csv/:projectId?entity=...`, `GET /json/:projectId` |
| Modify | `index.ts` | Mount `/api/export` with `aiLimiter` (PDF triggers AI report gen) |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/exportService.ts` | Each format with `responseType: 'blob'` + `URL.createObjectURL` for download |
| Create | `components/report/ExportMenu.tsx` | Dropdown button with format options + loading state |
| Modify | `pages/ReportViewer.tsx` | Replace print button with ExportMenu |
| Modify | `pages/ProjectDetail.tsx` | "Export Data" button for CSV/JSON |

### Dependencies
- **Server**: `npm install puppeteer docx` (puppeteer: ~300MB Chromium; consider `puppeteer-core` + system Chromium in prod)
- **Client**: None

### Report impact: None (export services consume the same HTML)

---

## Feature 9: Client Portal / Report Sharing

### Schema
```prisma
model ShareLink {
  id        String   @id @default(uuid())
  reportId  String
  report    Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
  token     String   @unique @default(uuid())
  password  String?          // bcrypt hash
  expiresAt DateTime
  maxViews  Int?
  viewCount Int      @default(0)
  isActive  Boolean  @default(true)
  createdBy String
  creator   User     @relation(fields: [createdBy], references: [id])
  createdAt DateTime @default(now())
  @@index([token])
}
```

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `controllers/shareController.ts` | `createShareLink`, `revokeLink`, `listLinks`, `viewSharedReport` (PUBLIC — no auth) |
| Create | `routes/shareRoutes.ts` | Authenticated: `POST /`, `DELETE /:id`, `GET /report/:reportId/links`. Public: `GET /view/:token`, `POST /view/:token/verify` |
| Modify | `index.ts` | Mount `/api/share` — public routes bypass `authenticate` |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/shareService.ts` | `createLink`, `revokeLink`, `listLinks`, `viewShared` |
| Create | `components/report/ShareModal.tsx` | Expiry picker, optional password, copy link, list existing links |
| Create | `pages/SharedReportViewer.tsx` | Public page (no sidebar), password prompt if needed |
| Modify | `App.tsx` | Public route `/shared/:token` outside authenticated layout |
| Modify | `pages/ReportViewer.tsx` | "Share" button opens ShareModal |

### Dependencies: None (bcrypt already installed)
### Report impact: None

---

## Feature 10: Notification System

### Schema
```prisma
model Notification {
  id         String           @id @default(uuid())
  userId     String
  user       User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type       NotificationType
  title      String
  message    String           @db.Text
  entityType String?
  entityId   String?
  projectId  String?
  isRead     Boolean          @default(false)
  readAt     DateTime?
  createdAt  DateTime         @default(now())
  @@index([userId, isRead, createdAt])
}

enum NotificationType {
  FINDING_ASSIGNED
  FINDING_STATUS_CHANGED
  REPORT_COMPLETED
  PROJECT_STATUS_CHANGED
  PROJECT_MEMBER_ADDED
  REMEDIATION_DUE
  SYSTEM
}
```

Add to `User`: `emailNotifications Boolean @default(true)`

### Server Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/notificationService.ts` | `createNotification`, `createBulk`, `sendEmail` (optional nodemailer), `getUnreadCount`, `markAsRead` |
| Create | `controllers/notificationController.ts` | `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`, `updatePreferences` |
| Create | `routes/notificationRoutes.ts` | Standard endpoints |
| Modify | `findingController.ts` | Notify on assignment/status change |
| Modify | `reportController.ts` | Notify on report completion |
| Modify | `projectController.ts` | Notify on status change |
| Modify | `index.ts` | Mount `/api/notifications` |

### Client Files
| Action | File | Details |
|--------|------|---------|
| Create | `services/notificationService.ts` | All endpoints |
| Create | `store/notificationBellStore.ts` | Zustand: `unreadCount`, `notifications`, `fetchUnread`, `markRead` (separate from toast notificationStore) |
| Create | `components/layout/NotificationBell.tsx` | Lucide Bell icon + badge count, dropdown panel with notification list |
| Create | `pages/NotificationsPage.tsx` | Full list view with read/unread filter |
| Modify | `types/index.ts` | `Notification`, `NotificationType` interfaces |
| Modify | Navbar component | Add NotificationBell |
| Modify | `App.tsx` | Route `/notifications` |

### Dependencies (optional): `npm install nodemailer @types/nodemailer` + SMTP env vars
### Report impact: None

---

## Migration Strategy

One migration per feature, named descriptively:
```
npx prisma migrate dev --name add_audit_log
npx prisma migrate dev --name extend_finding_status_and_remediation
npx prisma migrate dev --name add_attachments
npx prisma migrate dev --name add_finding_templates
npx prisma migrate dev --name add_cve_enrichment_to_finding
npx prisma migrate dev --name add_compliance_framework
npx prisma migrate dev --name extend_export_format_and_report
npx prisma migrate dev --name add_share_links
npx prisma migrate dev --name add_notifications
```

Enum extensions (FindingStatus, ExportFormat) are additive — Prisma handles via `ALTER TYPE ... ADD VALUE`.

## Verification

After each feature:
1. `npx prisma migrate dev` — migration applies cleanly
2. `npm run build` — zero TypeScript errors
3. Manual API testing via curl/Postman for new endpoints
4. Verify existing features still work (findings CRUD, IOC import, report generation)
5. For report-impacting features: generate a report and inspect the new sections
