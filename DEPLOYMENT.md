# Deployment Guide for martyschneider.com

This guide walks you through deploying the Cybersecurity Report Generator to your personal domain.

## 🎯 Deployment Architecture

We'll use this setup:
- **Frontend**: Deployed on Vercel or Netlify (free tier)
- **Backend**: Deployed on Railway or Render (free/cheap tier)
- **Database**: Railway PostgreSQL or Supabase (free tier)
- **Domain**: cyberreport.martyschneider.com (subdomain)

## 📋 Prerequisites

- [ ] Domain access to martyschneider.com
- [ ] GitHub account
- [ ] Anthropic API key
- [ ] Credit card for service verification (most have free tiers)

---

## Option 1: Railway (Recommended - Easiest)

Railway provides hosting for backend, database, and can handle everything in one place.

### Step 1: Prepare Repository

```bash
# 1. Initialize git (if not already)
cd cybersecurity-report-generator
git init
git add .
git commit -m "Initial commit"

# 2. Create GitHub repo and push
# Go to github.com and create new repository
git remote add origin https://github.com/YOUR_USERNAME/cybersecurity-report-generator.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend + Database on Railway

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub
   - Click "New Project"

2. **Create PostgreSQL Database**
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway will provision a database
   - Copy the `DATABASE_URL` from the "Connect" tab

3. **Deploy Backend**
   - Click "+ New" → "GitHub Repo"
   - Select your repository
   - Railway will detect the monorepo
   - Click "Add variables" and set:
     ```
     ROOT_DIRECTORY=/server
     PORT=5000
     NODE_ENV=production
     DATABASE_URL=[paste from database]
     JWT_SECRET=[generate strong random string]
     ANTHROPIC_API_KEY=[your API key]
     ```
   - Under "Settings" → "Networking":
     - Click "Generate Domain"
     - Note the URL (e.g., `your-backend.up.railway.app`)

4. **Run Migrations**
   - In Railway backend service, go to "Settings" → "Deploy"
   - Under "Custom Start Command", set:
     ```
     npx prisma migrate deploy && npm start
     ```
   - Or run migrations manually from "Variables" tab by adding:
     ```
     RAILWAY_RUN_BUILD_COMMAND=npx prisma migrate deploy
     ```

### Step 3: Deploy Frontend on Vercel

1. **Sign up for Vercel**
   - Go to https://vercel.com
   - Sign up with GitHub
   - Click "Add New" → "Project"

2. **Import Repository**
   - Select your GitHub repo
   - Framework: Vite
   - Root Directory: `client`

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Add Environment Variable**
   - Add variable:
     ```
     VITE_API_URL=https://your-backend.up.railway.app
     ```
   - Click "Deploy"

5. **Configure Custom Domain**
   - After deployment, go to "Settings" → "Domains"
   - Add domain: `cyberreport.martyschneider.com`
   - Vercel will show you DNS records to add

### Step 4: Configure DNS

Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.):

**For Vercel Frontend:**
```
Type: CNAME
Name: cyberreport
Value: cname.vercel-dns.com
```

**For Railway Backend (if using custom domain):**
```
Type: CNAME
Name: api.cyberreport
Value: your-backend.up.railway.app
```

### Step 5: Update CORS

Update `server/src/index.ts` to allow your domain:

```typescript
app.use(cors({
  origin: [
    'https://cyberreport.martyschneider.com',
    'http://localhost:3000', // Keep for local dev
  ],
  credentials: true,
}))
```

Commit and push changes.

---

## Option 2: Render (Alternative)

### Backend on Render

1. **Sign up at** https://render.com
2. **Create PostgreSQL Database**
   - "New" → "PostgreSQL"
   - Free tier available
   - Copy `Internal Database URL`

3. **Create Web Service**
   - "New" → "Web Service"
   - Connect GitHub repo
   - Settings:
     ```
     Name: cyberreport-api
     Root Directory: server
     Runtime: Node
     Build Command: npm install && npx prisma generate
     Start Command: npx prisma migrate deploy && npm start
     ```
   - Environment Variables:
     ```
     DATABASE_URL=[from database]
     NODE_ENV=production
     JWT_SECRET=[random string]
     ANTHROPIC_API_KEY=[your key]
     PORT=10000
     ```
   - Click "Create Web Service"
   - Note the URL (e.g., `https://cyberreport-api.onrender.com`)

4. **Deploy Frontend on Vercel** (same as above)

---

## Option 3: DigitalOcean App Platform

### Full Stack Deployment

1. **Sign up at** https://www.digitalocean.com
2. **Create App**
   - "Apps" → "Create App"
   - Choose GitHub, select repo

3. **Configure Components**

   **Database:**
   - Add "Database" component
   - Select PostgreSQL
   - Plan: Dev ($7/mo has free trial)

   **Backend:**
   - Detected as Node.js
   - Settings:
     ```
     Source Directory: /server
     Build Command: npm install && npx prisma generate
     Run Command: npx prisma migrate deploy && npm start
     Port: 5000
     ```

   **Frontend:**
   - Add another component
   - Settings:
     ```
     Source Directory: /client
     Build Command: npm install && npm run build
     Output Directory: /client/dist
     ```

4. **Environment Variables**
   - Add for backend component:
     ```
     DATABASE_URL=${db.DATABASE_URL}
     JWT_SECRET=[random string]
     ANTHROPIC_API_KEY=[your key]
     NODE_ENV=production
     ```

5. **Add Custom Domain**
   - Go to "Settings" → "Domains"
   - Add `cyberreport.martyschneider.com`
   - Follow DNS instructions

---

## Option 4: Self-Hosted on Your Own Server

If you have a VPS (DigitalOcean Droplet, AWS EC2, etc.):

### Prerequisites
- Ubuntu 20.04+ server
- Domain DNS pointed to server IP
- SSH access

### Deployment Steps

```bash
# 1. SSH into your server
ssh root@your-server-ip

# 2. Install dependencies
apt update
apt install -y nodejs npm postgresql nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sh

# 3. Setup PostgreSQL
sudo -u postgres psql
CREATE DATABASE cyberreport;
CREATE USER cyberreport WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE cyberreport TO cyberreport;
\q

# 4. Clone repository
git clone https://github.com/YOUR_USERNAME/cybersecurity-report-generator.git
cd cybersecurity-report-generator

# 5. Setup environment
cp .env.example .env
nano .env
# Add your configuration

# 6. Install and build
npm run install:all
cd server
npx prisma migrate deploy
npx prisma generate
npm run build
cd ../client
npm run build

# 7. Setup PM2 for process management
npm install -g pm2
cd ~/cybersecurity-report-generator/server
pm2 start dist/index.js --name cyberreport-api
pm2 startup
pm2 save

# 8. Configure Nginx
nano /etc/nginx/sites-available/cyberreport
```

**Nginx Configuration:**
```nginx
# Backend API
server {
    listen 80;
    server_name api.cyberreport.martyschneider.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Frontend
server {
    listen 80;
    server_name cyberreport.martyschneider.com;

    root /root/cybersecurity-report-generator/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/cyberreport /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 9. Setup SSL with Let's Encrypt
certbot --nginx -d cyberreport.martyschneider.com -d api.cyberreport.martyschneider.com

# 10. Update frontend API URL
cd ~/cybersecurity-report-generator/client
# Edit vite.config.ts or use environment variable
VITE_API_URL=https://api.cyberreport.martyschneider.com npm run build
```

---

## 🔒 Security Checklist

Before going live:

- [ ] Change `JWT_SECRET` to strong random string (32+ chars)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS (SSL certificate)
- [ ] Update CORS to only allow your domain
- [ ] Add rate limiting to backend
- [ ] Set up monitoring (Sentry, LogDNA)
- [ ] Configure database backups
- [ ] Add environment variable validation
- [ ] Review and update `.env` files
- [ ] Don't commit `.env` to git!

### Generate Strong JWT Secret
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))

# Or use online generator
# https://generate-secret.vercel.app/32
```

---

## 🧪 Testing Deployment

### 1. Test Backend
```bash
# Health check
curl https://your-backend-url.com/health

# Should return:
# {"status":"ok","timestamp":"2024-01-07T..."}

# Test auth
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"test123"}'
```

### 2. Test Frontend
- Open https://cyberreport.martyschneider.com
- Register an account
- Create a project
- Add IOCs
- Run AI analysis

### 3. Check Logs
**Railway:** Dashboard → Service → Logs
**Render:** Dashboard → Service → Logs
**Vercel:** Dashboard → Deployments → Function Logs
**Self-hosted:** `pm2 logs cyberreport-api`

---

## 💰 Cost Estimates

### Free Tier Options
- **Railway**: $5 free credits/month, then ~$5-10/mo
- **Render**: Free tier (sleeps after inactivity), or $7/mo
- **Vercel**: Free for personal projects
- **Supabase**: Free PostgreSQL (500MB)

### Recommended Setup (Cheapest)
- Frontend: **Vercel** (Free)
- Backend + DB: **Railway** (~$5-10/mo)
- **Total: ~$5-10/month**

### Premium Setup
- Frontend: **Vercel Pro** ($20/mo)
- Backend: **Render** ($7/mo)
- Database: **Railway** ($5/mo)
- Monitoring: **Sentry** (Free tier)
- **Total: ~$32/month**

### Self-Hosted
- DigitalOcean Droplet: $6/mo (1GB RAM)
- Domain SSL: Free (Let's Encrypt)
- **Total: ~$6/month**

---

## 🔧 Troubleshooting Deployment

### "Cannot connect to backend"
1. Check VITE_API_URL is correct
2. Verify CORS settings in backend
3. Check backend logs for errors
4. Test backend health endpoint

### "Database connection failed"
1. Verify DATABASE_URL format
2. Check database is running
3. Ensure migrations ran successfully
4. Check database logs

### "AI analysis doesn't work"
1. Verify ANTHROPIC_API_KEY is set
2. Check API key has credits
3. Review backend logs for API errors
4. Test API key directly with curl

### "CORS errors"
Update `server/src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'https://cyberreport.martyschneider.com',
    'https://www.martyschneider.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
  ].filter(Boolean),
  credentials: true,
}))
```

---

## 📊 Monitoring & Maintenance

### Add Sentry for Error Tracking
```bash
# Install Sentry
npm install --save @sentry/node @sentry/react

# Configure in server/src/index.ts
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

### Database Backups
**Railway**: Automatic daily backups
**Render**: Automatic backups on paid plans
**Self-hosted**: Setup cron job
```bash
# Add to crontab
0 2 * * * pg_dump cyberreport > /backups/cyberreport-$(date +\%Y\%m\%d).sql
```

### Update Deployment
```bash
# Push changes to GitHub
git add .
git commit -m "Update features"
git push

# Platforms auto-deploy on push
# Or trigger manual deploy from dashboard
```

---

## 🚀 Go Live Checklist

- [ ] Backend deployed and accessible
- [ ] Database provisioned and migrated
- [ ] Frontend deployed and accessible
- [ ] Custom domain configured (cyberreport.martyschneider.com)
- [ ] SSL certificate installed (HTTPS working)
- [ ] Environment variables set correctly
- [ ] CORS configured for your domain
- [ ] Test user registration
- [ ] Test project creation
- [ ] Test IOC input
- [ ] Test AI analysis (most important!)
- [ ] Check all pages load correctly
- [ ] Mobile responsive test
- [ ] Error tracking setup (Sentry)
- [ ] Database backups enabled
- [ ] Monitoring configured

---

## 📞 Support

If you run into issues:
1. Check platform-specific documentation
2. Review error logs
3. Test backend health endpoint
4. Verify environment variables
5. Check DNS propagation (can take up to 48 hours)

---

**Recommended Approach**: Start with Railway (easiest) or Vercel + Railway combo. You can always migrate later if needed.

**DNS Note**: After configuring DNS, it can take 15 minutes to 48 hours to propagate. Use https://dnschecker.org to verify.

**Your app will be live at**: https://cyberreport.martyschneider.com 🚀
