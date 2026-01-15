# Claude Development Log - Cybersecurity Report Generator

## Project Overview

A full-stack web application for generating professional cybersecurity assessment reports with AI-powered analysis.

**Tech Stack:**
- Frontend: React + TypeScript + Vite (deployed on Vercel at `cyberreport.martyschneider.com`)
- Backend: Express + TypeScript + Node.js (deployed on Railway at `cybersecurity-report-generator-production.up.railway.app`)
- Database: PostgreSQL + Prisma ORM
- AI: Anthropic Claude API (Sonnet 4)
- Authentication: JWT

**Key Features:**
- Project and finding management
- IOC (Indicator of Compromise) import via Excel/CSV with AI-powered column mapping
- MITRE ATT&CK TTP mapping
- AI-generated security assessment reports using Handlebars templates
- Control framework assessment with maturity levels
- Risk analysis and recommendations

---

## Current Session Summary (2026-01-15)

### Context
Continued from a previous session that ran out of context. The application had recently been deployed to production, and the user was testing the IOC import and report generation features for the first time in production.

### Issues Encountered & Fixed

#### 1. **404 Error - AI Column Mapping Endpoint** ✅ Fixed
**Commit:** `925afd9`

**Error:**
```
cybersecurity-report-generator-production.up.railway.app/api/ai/map-columns:1
Failed to load resource: the server responded with a status of 404
```

**Root Cause:**
Frontend service was calling `/api/ai/map-columns` but backend route was defined at `/api/iocs/map-columns`

**Files Changed:**
- `client/src/services/aiMappingService.ts` (line 27)

**Fix:**
```typescript
// Before:
const response = await apiClient.post<MappingResponse>('/ai/map-columns', {

// After:
const response = await apiClient.post<MappingResponse>('/iocs/map-columns', {
```

---

#### 2. **500 Error - Report Generation (Handlebars Template)** ✅ Fixed
**Commit:** `f0b6b3c`

**Error:**
```
Report generation failed: Parse error on line 2053:
...{#if roadmap.phases.1}}{{roadmap.phases.
-----------------------^
Expecting 'ID', got 'NUMBER'
```

**Root Cause:**
Handlebars doesn't support array index notation like `roadmap.phases.1`. The template was trying to access array elements using numeric indices directly.

**Files Changed:**
- `server/src/services/reportGenerationService.ts`
- `server/src/templates/report.hbs`

**Fix:**
1. Added `lookup` Handlebars helper for array access:
```typescript
Handlebars.registerHelper('lookup', function (obj, field) {
  return obj && obj[field]
})
```

2. Restructured `prepareTemplateData()` to generate roadmap once and provide milestone variables:
```typescript
// Generate roadmap once
const roadmap = this.generateRoadmap(assessment.recommendations)

return {
  // ... other data
  roadmap,
  milestone1: roadmap.phases[0],
  milestone2: roadmap.phases[1],
  milestone3: roadmap.phases[2],
}
```

3. Updated template to use milestone variables instead of array indices:
```handlebars
{{!-- Before --}}
{{roadmap.phases.0.name}}: {{roadmap.phases.0.description}}

{{!-- After --}}
{{#if milestone1}}{{milestone1.name}}: {{milestone1.description}}{{else}}Foundation: Initial security improvements{{/if}}
```

---

#### 3. **CORS Error on Error Responses** ✅ Fixed
**Commit:** `23981a5`

**Error:**
```
Access to XMLHttpRequest at 'https://cybersecurity-report-generator-production.up.railway.app/api/reports/generate'
from origin 'https://cyberreport.martyschneider.com' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:**
While CORS middleware was configured correctly for successful responses, error responses didn't include CORS headers. When the error handler returned responses, the browser blocked them due to missing CORS headers.

**Files Changed:**
- `server/src/middleware/errorHandler.ts`

**Fix:**
Added explicit CORS header setting in the error handler:
```typescript
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin
  const allowedOrigins = [
    'http://localhost:3000',
    'https://cybersecurity-report-generator.vercel.app',
    'https://cyberreport.martyschneider.com',
  ]

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  // ... rest of error handling
}
```

---

#### 4. **Prisma Validation Error - Missing User ID** ✅ Fixed
**Commit:** `7d3e104`

**Error:**
```
Invalid `prisma.report.create()` invocation:
Argument `generatedBy` is missing.
```

**Root Cause:**
JWT payload uses `id` field, but report controller was trying to access `userId`:
- Auth middleware sets: `req.user = { id, email, role }` (from `server/src/middleware/auth.ts`)
- Report controller was accessing: `req.user.userId` (incorrect)

**Files Changed:**
- `server/src/controllers/reportController.ts` (3 methods)

**Fix:**
Changed all instances from `req.user.userId` to `req.user.id`:
```typescript
// Before:
const userId = (req as any).user.userId

// After:
const userId = (req as any).user.id
```

Updated in:
- `generateReport()` - line 14
- `getReport()` - line 79
- `listReports()` - line 136

---

## Architecture Notes

### Authentication Flow
1. User logs in → JWT token generated with payload: `{ id, email, role }`
2. Token stored in client and sent in `Authorization: Bearer <token>` header
3. `authenticate` middleware verifies token and sets `req.user = { id, email, role }`
4. Controllers access user info via `req.user.id`, `req.user.email`, `req.user.role`

### Report Generation Flow
1. Frontend calls `POST /api/reports/generate` with `{ projectId }`
2. Backend fetches project data including findings, IOCs, TTPs
3. `reportAssessmentService` calls Anthropic Claude API to generate AI assessment
4. AI returns JSON with executive summary, risk assessment, control assessments, recommendations
5. `reportGenerationService` prepares template data and renders Handlebars template
6. HTML report returned to frontend for display

### IOC Import Flow
1. User uploads Excel/CSV file
2. File parsed on client, column headers extracted
3. Client calls `/api/iocs/map-columns` with columns and sample data
4. Backend calls Anthropic Claude API to intelligently map columns to IOC fields
5. AI returns mapping suggestions: `{ type, value, timestamp, context, source }`
6. User confirms/adjusts mapping
7. IOCs bulk created in database with mapped fields

### Key Files

**Backend:**
- `server/src/index.ts` - Express app setup, CORS configuration
- `server/src/middleware/auth.ts` - JWT authentication middleware
- `server/src/middleware/errorHandler.ts` - Centralized error handling with CORS
- `server/src/controllers/reportController.ts` - Report generation endpoints
- `server/src/controllers/iocController.ts` - IOC import and AI mapping
- `server/src/services/reportGenerationService.ts` - Handlebars template rendering
- `server/src/services/reportAssessmentService.ts` - AI assessment generation
- `server/src/templates/report.hbs` - Report HTML template
- `server/prisma/schema.prisma` - Database schema

**Frontend:**
- `client/src/services/aiMappingService.ts` - AI column mapping API calls
- `client/src/components/ioc/IOCImportModal.tsx` - IOC upload UI
- `client/src/pages/Dashboard.tsx` - Project dashboard
- `client/src/pages/ThreatAnalysis.tsx` - IOC management page

---

## Deployment Configuration

### Railway (Backend)
- **URL:** `https://cybersecurity-report-generator-production.up.railway.app`
- **Auto-deploy branch:** `main`
- **Build command:** `npm run build` (runs TypeScript compilation + template copy)
- **Start command:** `npm start`

**Required Environment Variables:**
```
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=production
JWT_SECRET=...
JWT_EXPIRES_IN=7d
ANTHROPIC_API_KEY=sk-ant-...
```

**Build Process:**
1. `npm run build` → `cd server && npm run build`
2. Server build: `tsc && node scripts/copy-templates.js`
3. TypeScript compilation creates `server/dist/`
4. `copy-templates.js` copies `.hbs` files from `src/templates/` to `dist/templates/`

### Vercel (Frontend)
- **URL:** `https://cyberreport.martyschneider.com`
- **Auto-deploy branch:** `main`
- **Build command:** `cd client && npm run build`
- **Output directory:** `client/dist`

---

## Git Workflow Notes

### Branch Naming Convention
Claude Code sessions use branches prefixed with `claude/` and ending with session ID:
- Example: `claude/review-report-generator-plan-Gi1ug`
- Claude can only push to branches matching pattern: `claude/*-<sessionId>`

### Deployment Trigger
Railway auto-deploys from `main` branch. To deploy:
1. Work on feature branch: `claude/feature-name-sessionId`
2. Commit and push to feature branch
3. Merge to `main` (Claude cannot push to main directly)
4. Railway detects `main` branch update and auto-deploys

---

## Current Status

### ✅ Working Features
- User authentication (login/register)
- Project CRUD operations
- Finding management
- IOC import via Excel/CSV with AI-powered column mapping
- Report generation with AI assessment
- All production errors fixed and deployed

### 🎨 Known Issues
- Report HTML output is functional but styling needs improvement
- User reported: "the output is ugly as hell but we can fix that"

### 📋 Next Steps
- Improve report template styling and layout
- Enhance report visual design
- Potentially add PDF export functionality
- Consider additional report customization options

---

## Development Commands

### Root Level
```bash
npm run dev                 # Run both client and server in dev mode
npm run build              # Build both client and server
npm run install:all        # Install dependencies for all packages
```

### Server
```bash
cd server
npm run dev                # Run server with tsx watch
npm run build              # TypeScript compile + copy templates
npm start                  # Run compiled server
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run database migrations
npm run prisma:push        # Push schema to database
```

### Client
```bash
cd client
npm run dev                # Run Vite dev server
npm run build              # Build production bundle
npm run preview            # Preview production build
```

---

## Important Technical Details

### Handlebars Template Limitations
- **Cannot use array index notation:** `{{array.0}}` or `{{array.1}}` will cause parse errors
- **Solution:** Either use `{{#each}}` loops or pass array elements as separate variables in template data
- **Helper required for dynamic access:** Use the `lookup` helper for computed array access

### CORS Configuration
- Backend explicitly allows: `localhost:3000`, Vercel domain, production domain
- CORS headers MUST be set in error responses, not just success responses
- Error handler now includes CORS headers for all origins in allowlist

### JWT Token Structure
```typescript
{
  id: string      // User UUID
  email: string   // User email
  role: string    // USER or ADMIN
}
```
**Important:** Use `req.user.id`, NOT `req.user.userId`

### Prisma Relationships
```
User → Projects (createdBy)
Project → Findings
Project → IOCs
Project → TTPMappings
Project → Reports
Project → ProjectMembers
```

---

## Testing Checklist

When testing end-to-end flow:
1. ✅ Login with valid credentials
2. ✅ Create new project
3. ✅ Upload IOC file (Excel/CSV)
4. ✅ AI column mapping suggests correct fields
5. ✅ IOCs imported successfully
6. ✅ Generate report from project
7. ✅ Report HTML displays (even if styling needs work)

---

## Contact & Resources

- **GitHub Repo:** marty-schneider/cybersecurity-report-generator
- **Production Frontend:** https://cyberreport.martyschneider.com
- **Production Backend:** https://cybersecurity-report-generator-production.up.railway.app
- **Current Branch:** `claude/review-report-generator-plan-Gi1ug`
- **Latest Commits:** See git log for session work

---

*Last Updated: 2026-01-15*
*Session: Gi1ug*
*Status: All production errors fixed, report generation working, styling improvements needed*
