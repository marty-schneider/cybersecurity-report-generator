# Building an AI-Powered Cybersecurity Report Generator: From Idea to Production

*A journey through full-stack development, AI integration, and cloud deployment*

---

## The Problem

As a cybersecurity professional, I found myself spending hours manually analyzing indicators of compromise (IOCs), researching threat tactics, and mapping them to the MITRE ATT&CK framework. Every penetration test or security assessment meant diving through logs, correlating events, and piecing together a coherent narrative about what attackers were doing.

I thought: what if AI could help automate this? What if I could just input IOCs with timestamps and let an AI system search through threat intelligence, map tactics to MITRE ATT&CK, and generate a comprehensive analysis?

So I decided to build it.

## The Vision

The goal was straightforward: create a web application where security professionals could:

1. Create assessment projects for different clients
2. Input IOCs (IP addresses, domains, file hashes, etc.) with timestamps
3. Let AI analyze the IOCs and automatically map them to MITRE ATT&CK techniques
4. Generate threat intelligence reports with timelines, narratives, and recommendations

Nothing too crazy—just a tool to save hours of manual work.

## Technology Decisions

I went with what I know works well together:

**Frontend:**
- React with TypeScript (type safety is non-negotiable)
- Vite for blazing-fast development
- TailwindCSS because I'm not a designer and utility classes are fast
- Zustand for state management (lighter than Redux, does everything I need)

**Backend:**
- Node.js with Express (classic, reliable)
- TypeScript here too (consistency across the stack)
- Prisma as the ORM (the type generation is chef's kiss)
- PostgreSQL for the database (relational data made sense here)

**AI Integration:**
- Anthropic's Claude API (specifically Sonnet 4)
- Why Claude? It's really good at structured outputs and understanding security concepts

**Hosting:**
- Vercel for the frontend (free tier, automatic deployments)
- Railway for backend and database (easy setup, reasonable pricing)

## The Build Process

### Phase 1: Foundation

First, I set up the project structure. Monorepo approach with separate `client` and `server` directories. Nothing fancy, but organized.

The Prisma schema was critical to get right from the start. I designed it to handle:
- Users with authentication
- Projects (assessment engagements)
- Findings (vulnerabilities discovered)
- IOCs with timestamps and context
- TTP mappings to MITRE ATT&CK
- Project members and permissions

Here's what the core IOC model looked like:

```prisma
model IOC {
  id              String   @id @default(uuid())
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id])
  type            IOCType
  value           String
  timestamp       DateTime
  context         String?
  source          String?
  enrichmentData  Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId, timestamp])
  @@index([type, value])
}
```

The indexes on `projectId + timestamp` were key for performance when querying IOCs chronologically.

### Phase 2: Authentication

I went with JWT tokens. Not the most complex auth system, but it works:
- bcrypt for password hashing (10 rounds)
- 7-day token expiration
- Token stored in Zustand with persistence to localStorage
- Axios interceptors to automatically attach tokens to requests

Simple, secure enough for an MVP.

### Phase 3: The AI Integration (The Fun Part)

This is where it got interesting. The challenge was getting Claude to return structured, consistent JSON responses.

I built an `AIAnalysisService` that takes a list of IOCs and sends them to Claude with a carefully structured prompt:

```typescript
async analyzeIOCs(iocs: IOCData[], projectContext?: string): Promise<AnalysisResult> {
  const prompt = this.buildAnalysisPrompt(iocs, projectContext)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  })

  return this.parseAnalysisResponse(responseText)
}
```

The prompt engineering was crucial. I had to:
- Clearly specify I wanted JSON output
- Provide the exact schema I expected
- Include context about the assessment type
- Ask for confidence scores (0.0-1.0) for each TTP mapping
- Request both technical analysis and executive summaries

### Phase 4: MITRE ATT&CK Integration

I created a curated database of 15 common MITRE ATT&CK techniques:

```typescript
const MITRE_TECHNIQUES: Record<string, MitreTechnique> = {
  'T1566.001': {
    id: 'T1566.001',
    name: 'Phishing: Spearphishing Attachment',
    tactics: ['Initial Access'],
    url: 'https://attack.mitre.org/techniques/T1566/001/',
    // ... more details
  },
  // ... 14 more techniques
}
```

When Claude returns TTP IDs, I validate them against this database to ensure they're real techniques before storing them.

### Phase 5: The UI

I kept the UI clean and functional. Main screens:

1. **Dashboard** - Stats overview, recent projects
2. **Project List** - All your assessments
3. **Project Detail** - Findings, IOCs, metadata
4. **Threat Analysis** - The star of the show

The Threat Analysis page lets you:
- Add IOCs one by one or bulk import
- Each IOC has a type (IP, domain, hash, etc.), value, timestamp, and context
- Click "Analyze with AI" and watch the magic happen
- See TTPs mapped with confidence scores
- Read the AI-generated narrative and timeline
- View threat actor profiling

I used color coding for confidence levels (green for high, yellow for medium, red for low) and severity badges throughout.

## The Deployment Journey (The Real Adventure)

This is where theory met reality. Deploying a full-stack TypeScript app with AI integration and a database turned out to be... educational.

### Challenge 1: Railway Build Timeouts

First deployment attempt: Build timeout.

Why? Puppeteer. I had included it in `package.json` for future PDF generation, but it downloads an entire Chrome binary during `npm install`. On Railway's free tier, this exceeded the build timeout.

Solution: Removed Puppeteer (we weren't using it yet anyway).

### Challenge 2: TypeScript Compilation Errors

Second deployment attempt: TypeScript compilation failed.

Multiple issues:
- Unused variables (I had `noUnusedLocals: true` in tsconfig)
- Wrong Prisma query syntax (`include` instead of `select`)
- JWT type inference issues with the `expiresIn` parameter
- Outdated Anthropic SDK version

Fixes:
- Disabled strict unused checks for production builds
- Fixed Prisma queries
- Simplified JWT token generation
- Updated Anthropic SDK to latest version

### Challenge 3: Database Migrations

Third issue: Prisma needed migration files, but I hadn't created any.

Railway was trying to run `prisma migrate deploy` but there were no migration files in the repo.

Solution: Changed the start command to use `prisma db push` instead, which applies the schema directly without migration files. Perfect for initial deployment.

### Challenge 4: CORS Configuration

Once everything was deployed, the frontend couldn't talk to the backend. Classic CORS issue.

I had to explicitly configure allowed origins:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://cybersecurity-report-generator.vercel.app',
  'https://cyberreport.martyschneider.com',
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // Allow non-browser requests
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
```

### Challenge 5: Environment Variables

Frontend needed to know where the backend was. Enter Vite environment variables:

```typescript
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
```

Set `VITE_API_URL` in Vercel's environment settings, and boom—frontend knows where to send requests.

### Challenge 6: Custom Domain

Getting `cyberreport.martyschneider.com` working required:
1. Adding the domain in Vercel
2. Creating a CNAME record in my DNS provider (WordPress.com)
3. Waiting for DNS propagation (thankfully only took about 10 minutes)
4. Updating CORS to include the custom domain

## What I Learned

**1. TypeScript is worth it, but strict mode in production is optional**

Type safety during development is incredible. But `noUnusedLocals` and `noUnusedParameters` causing production builds to fail? Not worth it. I keep them enabled locally but disabled for builds.

**2. AI is genuinely useful for security analysis**

Claude consistently mapped IOCs to appropriate MITRE techniques with reasonable confidence scores. The narrative generation was surprisingly coherent. It's not perfect, but it's a huge time-saver.

**3. Prompt engineering matters**

The difference between "analyze these IOCs" and a structured prompt with examples, schema definitions, and context is night and day. Specificity gets results.

**4. Deployment is still hard**

Even with modern platforms like Vercel and Railway, you'll hit issues. Build timeouts, TypeScript configs, CORS, environment variables—it all adds up. But once it works, automatic deployments from GitHub are pure magic.

**5. Start simple, iterate later**

I almost added PDF generation, team collaboration features, and automated testing before deploying. Glad I didn't. Get the MVP working first. The rest can come later.

## The Final Product

After working through all the deployment challenges, I ended up with:

- **Frontend**: Live at cyberreport.martyschneider.com
- **Backend**: Running on Railway with PostgreSQL
- **Cost**: ~$5-10/month (Railway usage-based pricing)
- **Features**: Full authentication, project management, IOC tracking, AI-powered TTP analysis

The complete workflow:
1. Register and log in
2. Create a new assessment project
3. Navigate to Threat Analysis
4. Input IOCs with timestamps
5. Click "Analyze with AI"
6. Get back MITRE ATT&CK mappings, confidence scores, timeline, narrative, and recommendations

## What's Next?

The MVP works, but there's plenty to add:

- **PDF Report Generation**: Re-add Puppeteer and generate downloadable reports
- **DOCX Export**: For clients who prefer Word documents
- **Team Collaboration**: Let multiple analysts work on the same project
- **Rate Limiting**: Protect the AI endpoints from abuse
- **Advanced Analytics**: Charts, graphs, attack chain visualization
- **Integration with OSINT tools**: Automatically enrich IOCs with VirusTotal, AbuseIPDB, etc.

## Wrapping Up

Building this tool scratched a real itch. Manual IOC analysis is tedious, and MITRE mapping is time-consuming. Having AI handle the initial analysis while I focus on interpretation and recommendations? That's the kind of automation I can get behind.

The tech stack worked well together. TypeScript gave me confidence, Prisma made database work pleasant, and Claude's API delivered on the AI analysis. The deployment headaches were real but solvable.

If you're a security professional dealing with IOC analysis regularly, or if you're interested in building AI-powered tools for cybersecurity, I hope this journey gives you some ideas (and saves you from some of the pitfalls I hit).

Now if you'll excuse me, I have some actual threat hunting to do—and a new tool to use for it.

---

**Tech Stack Summary:**
- Frontend: React, TypeScript, Vite, TailwindCSS, Zustand
- Backend: Node.js, Express, TypeScript, Prisma, PostgreSQL
- AI: Anthropic Claude Sonnet 4
- Hosting: Vercel (frontend), Railway (backend + database)
- Security: JWT authentication, bcrypt password hashing, HTTPS

**GitHub**: [github.com/marty-schneider/cybersecurity-report-generator](https://github.com/marty-schneider/cybersecurity-report-generator)

**Live Demo**: [cyberreport.martyschneider.com](https://cyberreport.martyschneider.com)
