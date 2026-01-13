import { logger } from './logger.js'

interface RequiredEnvVars {
  DATABASE_URL: string
  JWT_SECRET: string
  ANTHROPIC_API_KEY: string
}

export function validateEnvironment(): void {
  const requiredEnvVars: (keyof RequiredEnvVars)[] = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ANTHROPIC_API_KEY',
  ]

  const missing: string[] = []
  const empty: string[] = []

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar]

    if (!value) {
      missing.push(envVar)
    } else if (value.trim() === '') {
      empty.push(envVar)
    }
  }

  if (missing.length > 0 || empty.length > 0) {
    logger.error('Environment validation failed!')

    if (missing.length > 0) {
      logger.error(`Missing required environment variables: ${missing.join(', ')}`)
    }

    if (empty.length > 0) {
      logger.error(`Empty environment variables: ${empty.join(', ')}`)
    }

    logger.error('\nRequired environment variables:')
    logger.error('  DATABASE_URL - PostgreSQL connection string')
    logger.error('  JWT_SECRET - Secret key for JWT tokens')
    logger.error('  ANTHROPIC_API_KEY - API key for Claude AI')

    process.exit(1)
  }

  logger.info('✓ Environment validation passed')
}
