import { vi, beforeEach } from 'vitest'
import { mockPrisma } from '../__mocks__/prisma.js'

// Mock Prisma client
vi.mock('../utils/db.js', () => ({
  prisma: mockPrisma,
}))

// Mock logger to silence output during tests
vi.mock('../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Set test environment variables
process.env.JWT_SECRET = 'test-secret-key-for-vitest'
process.env.NODE_ENV = 'test'

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})
