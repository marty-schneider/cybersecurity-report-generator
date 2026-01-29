# Cybersecurity Report Generator

A full-stack web application for generating professional cybersecurity assessment reports with **AI-powered IOC analysis** and **automatic MITRE ATT&CK TTP mapping**.

## 🚀 Key Features

### Core Functionality
- **Project Management**: Create and manage penetration testing, vulnerability assessments, security audits, and red team engagements
- **Finding Management**: Document vulnerabilities with severity ratings, CVSS scores, evidence, and remediation steps
- **Multi-User Collaboration**: Role-based access control (Owner, Editor, Viewer) for team projects

### 🤖 AI-Powered Threat Intelligence (The Star Feature!)
- **IOC Input**: Add Indicators of Compromise with timestamps, types (IP, domain, hash, CVE, etc.), and context
- **AI Analysis**: Click "Analyze with AI" to leverage Anthropic Claude for intelligent threat analysis
- **Automatic TTP Mapping**: AI automatically maps IOCs to MITRE ATT&CK techniques with confidence scores
- **Narrative Generation**: Get comprehensive attack timelines, threat actor profiles, and recommendations
- **MITRE ATT&CK Integration**: Visual technique cards with detection and mitigation guidance

### Report Generation (Coming Soon)
- Export professional reports in PDF and DOCX formats
- Include findings, IOCs, TTPs, and AI-generated insights
- Customizable templates for different assessment types

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Zustand (state management)
- React Router (navigation)
- Axios (API client)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL + Prisma ORM
- JWT Authentication
- **Anthropic Claude API** (AI analysis)
- Winston (logging)

## 📋 Prerequisites

- **Node.js 20+** and npm
- **PostgreSQL 16+** (or use Docker)
- **Anthropic API Key** (get one at https://console.anthropic.com/)
- **Docker & Docker Compose** (optional but recommended)

## ⚡ Quick Start

### Option 1: Using Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd cybersecurity-report-generator
```

2. **Set up environment variables**
```bash
# Edit the .env file and add your Anthropic API key
nano .env
```

Add your API key:
```env
ANTHROPIC_API_KEY=sk-ant-api-your-key-here
```

3. **Start with Docker Compose**
```bash
docker-compose -f docker/docker-compose.yml up -d
```

This will start:
- PostgreSQL database on port 5432
- Backend server on port 5000
- Frontend client on port 3000

4. **Run database migrations**
```bash
docker exec -it cyberreport-server npx prisma migrate dev
```

5. **Open the app**
Navigate to http://localhost:3000

### Option 2: Manual Setup

1. **Clone and setup**
```bash
git clone <repository-url>
cd cybersecurity-report-generator
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

3. **Set up PostgreSQL**
```bash
# Create database
createdb cyberreport
```

4. **Configure environment**
```bash
# Edit server/.env
cd server
cp .env.example .env
nano .env
```

Add your configuration:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/cyberreport?schema=public"
ANTHROPIC_API_KEY=sk-ant-api-your-key-here
JWT_SECRET=your-random-secret-key-at-least-32-characters-long
```

5. **Run database migrations**
```bash
cd server
npx prisma migrate dev
npx prisma generate
```

6. **Start the application**

Terminal 1 - Server:
```bash
cd server
npm run dev
```

Terminal 2 - Client:
```bash
cd client
npm run dev
```

7. **Open the app**
Navigate to https://cyberreport.martyschneider.com

## 📚 Usage Guide

### 1. Create an Account
- Navigate to https://cyberreport.martyschneider.com
- Click "Register" and create your account
- Login with your credentials

### 2. Create a Project
- Click "Projects" in the sidebar
- Click "+ New Project"
- Fill in project details:
  - Name (e.g., "ACME Corp Pentest")
  - Client name
  - Assessment type (Pentest, Vuln Assessment, etc.)
  - Start/end dates
- Click "Create Project"

### 3. Add Findings
- Click on your project
- Click "+ Add Finding"
- Document vulnerabilities:
  - Title and description
  - Severity (Critical, High, Medium, Low, Info)
  - CVSS score
  - Affected systems
  - Evidence
  - Remediation steps

### 4. Add IOCs and Run AI Analysis (The Magic!)
- Click "🔍 Threat Analysis" button in your project
- Click "+ Add IOC" to add indicators:
  - Select IOC type (IP, Domain, Hash, CVE, etc.)
  - Enter the value
  - Set timestamp (when it was observed)
  - Add context (what was happening)
  - Add source (where you found it)
- Repeat for all IOCs you discovered
- Click "🤖 Analyze with AI" button
- Wait for Claude to analyze (takes 10-30 seconds)

**You'll get:**
- Comprehensive attack narrative
- Timeline of the attack progression
- MITRE ATT&CK techniques automatically identified
- Confidence scores for each technique
- Threat actor profiling
- Security recommendations

### 5. View Results
- **AI Analysis section**: Read the narrative about the attack
- **MITRE ATT&CK Techniques**: See which TTPs were used with confidence scores
- **IOC Timeline**: View all indicators chronologically
- Each technique shows description, tactics, and reasoning

## 🗂️ Project Structure

```
cybersecurity-report-generator/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── store/         # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   └── App.tsx        # Main app component
│   └── package.json
├── server/                # Express backend
│   ├── prisma/           # Database schema
│   ├── src/
│   │   ├── controllers/  # Route controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic (AI, MITRE)
│   │   ├── middleware/   # Auth, error handling
│   │   └── utils/        # Utilities
│   └── package.json
├── docker/               # Docker configuration
└── .env                  # Environment variables
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Findings
- `GET /api/findings?projectId=:id` - List findings for project
- `POST /api/findings` - Create finding
- `PUT /api/findings/:id` - Update finding
- `DELETE /api/findings/:id` - Delete finding

### IOCs
- `GET /api/iocs?projectId=:id` - List IOCs for project
- `POST /api/iocs` - Create IOC
- `POST /api/iocs/bulk` - Bulk import IOCs
- `PUT /api/iocs/:id` - Update IOC
- `DELETE /api/iocs/:id` - Delete IOC

### TTPs (AI Analysis)
- `GET /api/ttps?projectId=:id` - List TTP mappings
- **`POST /api/ttps/analyze`** - Trigger AI analysis (Magic happens here!)
- `GET /api/ttps/matrix` - Get MITRE ATT&CK matrix
- `GET /api/ttps/technique/:id` - Get technique details

## 🧪 Database Management

### Run migrations
```bash
cd server
npx prisma migrate dev
```

### Generate Prisma Client
```bash
cd server
npx prisma generate
```

### Open Prisma Studio (Database GUI)
```bash
cd server
npx prisma studio
```

### Reset database
```bash
cd server
npx prisma migrate reset
```

## 🔒 Security Notes

- **Change JWT_SECRET** in production to a strong random string
- **Protect your ANTHROPIC_API_KEY** - never commit it to git
- Use environment variables for all secrets
- Enable HTTPS in production
- Implement rate limiting for AI endpoints (can be expensive!)

## 💡 Tips & Tricks

### Getting Good AI Analysis Results
1. **Add context to IOCs**: The more context you provide, the better the AI understands
2. **Use accurate timestamps**: Helps AI understand attack timeline
3. **Include various IOC types**: IPs, domains, hashes, commands, etc.
4. **Add 5-10 IOCs minimum**: More data = better analysis
5. **Be specific in source field**: "EDR alert", "firewall log", etc.

### MITRE ATT&CK Techniques
- Confidence scores: 80%+ = High confidence, 60-80% = Medium, <60% = Low
- Click technique IDs to learn more
- AI explains why each technique was identified
- Use detection/mitigation guidance for response

## 🐛 Troubleshooting

### Server won't start
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in .env
- Run `npx prisma generate`

### AI analysis fails
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key has credits
- Look at server logs: `docker logs cyberreport-server`

### Frontend can't connect to backend
- Verify server is running on port 5000
- Check CORS settings in server/src/index.ts
- Clear browser cache

### Database errors
- Run migrations: `npx prisma migrate dev`
- Reset if needed: `npx prisma migrate reset`
- Check PostgreSQL logs

## 📈 Roadmap

- [x] User authentication
- [x] Project management
- [x] Finding management
- [x] IOC input and tracking
- [x] AI-powered TTP analysis
- [x] MITRE ATT&CK integration
- [ ] PDF report generation
- [ ] DOCX report export
- [ ] Custom report templates
- [ ] Team collaboration features
- [ ] Email notifications
- [ ] Dashboard analytics
- [ ] Bulk IOC import from CSV/JSON
- [ ] Integration with threat feeds

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

MIT

## 🙏 Acknowledgments

- **Anthropic Claude** for AI analysis capabilities
- **MITRE ATT&CK®** for the threat intelligence framework
- Built with modern web technologies: React, TypeScript, Prisma, TailwindCSS

---

**Need help?** Open an issue or contact the maintainers.

**Want to see it in action?** Check the screenshots folder (coming soon).
