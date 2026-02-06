import { vi } from 'vitest'
import { auditService } from '../auditService.js'
import { mockPrisma } from '../../__mocks__/prisma.js'
import { logger } from '../../utils/logger.js'

describe('auditService.log', () => {
  it('calls prisma.auditLog.create with correct data', () => {
    auditService.log({
      userId: 'user-1',
      projectId: 'project-1',
      action: 'CREATE' as any,
      entityType: 'Finding',
      entityId: 'f1',
      details: { title: 'New finding' },
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        projectId: 'project-1',
        action: 'CREATE',
        entityType: 'Finding',
        entityId: 'f1',
      }),
    })
  })

  it('extracts IP from req.ip', () => {
    auditService.log({
      userId: 'user-1',
      action: 'CREATE' as any,
      entityType: 'Finding',
      req: { ip: '10.0.0.1', headers: {} },
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '10.0.0.1',
      }),
    })
  })

  it('extracts user-agent from req headers', () => {
    auditService.log({
      userId: 'user-1',
      action: 'CREATE' as any,
      entityType: 'Finding',
      req: { ip: '127.0.0.1', headers: { 'user-agent': 'TestBrowser/1.0' } },
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userAgent: 'TestBrowser/1.0',
      }),
    })
  })

  it('handles missing req parameter', () => {
    auditService.log({
      userId: 'user-1',
      action: 'DELETE' as any,
      entityType: 'IOC',
    })

    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1)
  })

  it('does not throw when prisma rejects', async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB error'))

    // Should not throw
    auditService.log({
      userId: 'user-1',
      action: 'CREATE' as any,
      entityType: 'Finding',
    })

    // Wait for the .catch handler to fire
    await new Promise(r => setTimeout(r, 20))

    expect(logger.error).toHaveBeenCalledWith('Audit log write failed:', expect.any(Error))
  })

  it('returns void', () => {
    const result = auditService.log({
      userId: 'user-1',
      action: 'CREATE' as any,
      entityType: 'Finding',
    })

    expect(result).toBeUndefined()
  })
})
