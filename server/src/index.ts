import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { errorHandler } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'
import { validateEnvironment } from './utils/validateEnv.js'
import { prisma } from './utils/db.js'
import authRoutes from './routes/authRoutes.js'
import projectRoutes from './routes/projectRoutes.js'
import findingRoutes from './routes/findingRoutes.js'
import iocRoutes from './routes/iocRoutes.js'
import ttpRoutes from './routes/ttpRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import remediationRoutes from './routes/remediationRoutes.js'
import attachmentRoutes from './routes/attachmentRoutes.js'

// Load environment variables first
dotenv.config()

// Validate required environment variables before starting
validateEnvironment()

const app = express()
const PORT = process.env.PORT || 5000

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://cybersecurity-report-generator.vercel.app',
  'https://cyberreport.martyschneider.com',
]

// Middleware
// Configure helmet with relaxed CORS settings for production
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false, // Disable to allow cross-origin requests
}))

// CORS must come after helmet but with comprehensive options
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn(`CORS: Blocked request from origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutes
  preflightContinue: false,
  optionsSuccessStatus: 204,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Rate limiting - general API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
})

// Strict rate limiter for AI-powered endpoints (expensive API calls)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI analysis requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI analysis rate limit reached. Please try again later.' },
})

// Auth rate limiter (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
})

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/projects', apiLimiter, projectRoutes)
app.use('/api/findings', apiLimiter, findingRoutes)
app.use('/api/iocs', apiLimiter, iocRoutes)
app.use('/api/ttps', aiLimiter, ttpRoutes)
app.use('/api/reports', aiLimiter, reportRoutes)
app.use('/api/audit', apiLimiter, auditRoutes)
app.use('/api/remediation', apiLimiter, remediationRoutes)
app.use('/api/attachments', apiLimiter, attachmentRoutes)

// Error handling
app.use(errorHandler)

// Test database connection before starting server
async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...')
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info('✓ Database connection successful')

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
      logger.info(`Allowed origins: ${allowedOrigins.join(', ')}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    logger.error('Database connection failed. Please check your DATABASE_URL environment variable.')
    process.exit(1)
  }
}

startServer()
