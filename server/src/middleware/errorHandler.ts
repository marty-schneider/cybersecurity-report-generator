import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

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

  if (err instanceof AppError) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`)

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
  }

  // Unexpected errors
  logger.error(`500 - ${err.message} - ${req.originalUrl} - ${req.method}`, {
    stack: err.stack,
  })

  return res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  })
}
