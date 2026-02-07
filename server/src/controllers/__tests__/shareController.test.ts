import { vi } from 'vitest'
import { createShareLink, revokeShareLink, viewSharedReport, verifyAndViewSharedReport } from '../shareController.js'
import { AppError } from '../../middleware/errorHandler.js'
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/express.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}))

// Mock report generation service
vi.mock('../../services/reportGenerationService.js', () => ({
  reportGenerationService: {
    generateReport: vi.fn().mockResolvedValue('<html>Report</html>'),
  },
}))

describe('createShareLink', () => {
  it('creates a share link with default expiry', async () => {
    const req = mockRequest({
      body: { reportId: 'r1' },
    })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.report.findUnique.mockResolvedValueOnce({
      id: 'r1',
      projectId: 'p1',
      project: { id: 'p1' },
    })
    mockPrisma.project.findFirst.mockResolvedValueOnce({ id: 'p1' })
    mockPrisma.shareLink.create.mockResolvedValueOnce({
      id: 'sl1',
      token: 'test-token-123',
      expiresAt: new Date('2025-01-22'),
      maxViews: null,
    })

    await createShareLink(req, res, next)

    expect(res._status).toBe(201)
    expect(res._json).toMatchObject({
      id: 'sl1',
      token: 'test-token-123',
    })
  })

  it('returns 400 when reportId missing', async () => {
    const req = mockRequest({ body: {} })
    const res = mockResponse()
    const next = mockNext()

    await createShareLink(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(400)
  })

  it('returns 404 when report not found', async () => {
    const req = mockRequest({ body: { reportId: 'nonexistent' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.report.findUnique.mockResolvedValueOnce(null)

    await createShareLink(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(404)
  })

  it('returns 403 when user has no access', async () => {
    const req = mockRequest({ body: { reportId: 'r1' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.report.findUnique.mockResolvedValueOnce({
      id: 'r1',
      projectId: 'p1',
      project: { id: 'p1' },
    })
    mockPrisma.project.findFirst.mockResolvedValueOnce(null)

    await createShareLink(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(403)
  })
})

describe('revokeShareLink', () => {
  it('sets isActive to false', async () => {
    const req = mockRequest({ params: { id: 'sl1' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({
      id: 'sl1',
      createdBy: 'test-user-id',
    })
    mockPrisma.shareLink.update.mockResolvedValueOnce({})

    await revokeShareLink(req, res, next)

    expect(mockPrisma.shareLink.update).toHaveBeenCalledWith({
      where: { id: 'sl1' },
      data: { isActive: false },
    })
    expect(res._json).toMatchObject({ message: 'Share link revoked' })
  })

  it('returns 404 when link not found', async () => {
    const req = mockRequest({ params: { id: 'nonexistent' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null)

    await revokeShareLink(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(404)
  })

  it('returns 403 when user is not the creator', async () => {
    const req = mockRequest({ params: { id: 'sl1' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({
      id: 'sl1',
      createdBy: 'other-user',
    })

    await revokeShareLink(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(403)
  })
})

describe('viewSharedReport', () => {
  const validLink = {
    id: 'sl1',
    token: 'valid-token',
    isActive: true,
    expiresAt: new Date(Date.now() + 86400000), // tomorrow
    maxViews: 10,
    viewCount: 0,
    password: null,
    report: {
      id: 'r1',
      projectId: 'p1',
      project: { id: 'p1', name: 'Test Project' },
    },
  }

  it('returns report HTML for valid token', async () => {
    const req = mockRequest({ params: { token: 'valid-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce(validLink)
    mockPrisma.shareLink.update.mockResolvedValueOnce({})

    await viewSharedReport(req, res, next)

    expect(res._json).toMatchObject({
      html: '<html>Report</html>',
      projectName: 'Test Project',
    })
  })

  it('returns 404 for invalid token', async () => {
    const req = mockRequest({ params: { token: 'bad-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce(null)

    await viewSharedReport(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(404)
  })

  it('returns 410 for revoked link', async () => {
    const req = mockRequest({ params: { token: 'revoked-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({ ...validLink, isActive: false })

    await viewSharedReport(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(410)
  })

  it('returns 410 for expired link', async () => {
    const req = mockRequest({ params: { token: 'expired-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({
      ...validLink,
      expiresAt: new Date('2020-01-01'),
    })

    await viewSharedReport(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(410)
  })

  it('returns 410 when view limit reached', async () => {
    const req = mockRequest({ params: { token: 'maxed-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({
      ...validLink,
      maxViews: 5,
      viewCount: 5,
    })

    await viewSharedReport(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(410)
  })

  it('returns 401 when password is required', async () => {
    const req = mockRequest({ params: { token: 'protected-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce({
      ...validLink,
      password: 'hashed-pw',
    })

    await viewSharedReport(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
  })

  it('increments view count on success', async () => {
    const req = mockRequest({ params: { token: 'valid-token' } })
    const res = mockResponse()
    const next = mockNext()

    mockPrisma.shareLink.findUnique.mockResolvedValueOnce(validLink)
    mockPrisma.shareLink.update.mockResolvedValueOnce({})

    await viewSharedReport(req, res, next)

    expect(mockPrisma.shareLink.update).toHaveBeenCalledWith({
      where: { id: 'sl1' },
      data: { viewCount: { increment: 1 } },
    })
  })
})
