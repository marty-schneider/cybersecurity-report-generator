# Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js 20+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] PostgreSQL 16+ installed (or Docker)
- [ ] Anthropic API key (https://console.anthropic.com/)

## 5-Minute Setup

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-api...`)

### 2. Configure Environment

Edit `.env` and `server/.env`:

```bash
# Add your API key
ANTHROPIC_API_KEY=sk-ant-api-your-actual-key-here

# Keep these defaults for local development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cyberreport?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-characters-long
```

### 3. Choose Your Setup Method

#### Option A: Docker (Easiest - Recommended)

```bash
# Start everything
docker-compose -f docker/docker-compose.yml up -d

# Run migrations
docker exec -it cyberreport-server npx prisma migrate dev

# Open app
# http://localhost:3000
```

#### Option B: Manual Setup

```bash
# 1. Install dependencies
npm run install:all

# 2. Setup database
createdb cyberreport

# 3. Run migrations
cd server
npx prisma migrate dev
npx prisma generate

# 4. Start server (Terminal 1)
cd server
npm run dev

# 5. Start client (Terminal 2)
cd client
npm run dev

# 6. Open app
# http://localhost:3000
```

## First Use

1. **Register**: Create an account at http://localhost:3000
2. **Login**: Sign in with your credentials
3. **Create Project**: Click "Projects" → "+ New Project"
4. **Add IOCs**: In project, click "🔍 Threat Analysis" → "+ Add IOC"
5. **Analyze**: After adding 5+ IOCs, click "🤖 Analyze with AI"

## Test the AI Feature

Try these sample IOCs to test the AI analysis:

```
Type: IP_ADDRESS
Value: 192.168.1.100
Timestamp: [Today's date]
Context: Suspicious outbound connection to known C2 server

Type: DOMAIN
Value: malicious-phishing-site.com
Timestamp: [Today's date]
Context: Domain from phishing email link

Type: FILE_HASH_SHA256
Value: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Timestamp: [Today's date]
Context: Malicious payload dropped by initial compromise

Type: COMMAND_LINE
Value: powershell.exe -enc base64encodedcommandhere
Timestamp: [Today's date]
Context: Obfuscated PowerShell execution detected in process logs
```

Click "🤖 Analyze with AI" and watch the magic happen!

## Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
pg_isready

# If using Docker
docker ps | grep postgres
```

### "AI analysis fails"
- Check your ANTHROPIC_API_KEY is correct
- Verify API key has credits at https://console.anthropic.com/
- Look at server logs for error details

### "npm install fails"
```bash
# Clear cache and retry
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### "Port already in use"
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

## What's Next?

After setup, check out:
- 📖 Full documentation in `README.md`
- 🗂️ Database schema in `server/prisma/schema.prisma`
- 🔌 API routes in `server/src/routes/`
- 🎨 Frontend pages in `client/src/pages/`

## Need Help?

- Check `README.md` for detailed documentation
- Review server logs: `docker logs cyberreport-server` (if using Docker)
- Open an issue on GitHub
- Email: [your-email@example.com]

---

**Ready to go!** 🚀

Your app should now be running at http://localhost:3000
