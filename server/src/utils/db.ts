import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

// Handle graceful shutdown
process.on('beforeExit', async () => {
  logger.info('Disconnecting from database...')
  await prisma.$disconnect()
})
