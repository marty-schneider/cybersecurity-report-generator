import { vi } from 'vitest'
import { verifyProjectAccess, verifyResourceAccess } from '../projectAccess.js'
import type { ProjectRequest } from '../projectAccess.js'
import { AppError } from '../errorHandler.js'
import { mockRequest } from '../../__tests__/helpers/express.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

const fakeProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'Test',
  assessmentType: 'PENETRATION_TEST',
  status: 'IN_PROGRESS',
  createdBy: 'test-user-id',
  clientName: 'Test Client',
  scope: 'Test scope',
  startDate: new Date(),
  endDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('verifyProjectAccess', () => {
  it('returns the project when found (read mode)', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(fakeProject)
    const req = mockRequest({ params: { projectId: 'project-1' } }) as ProjectRequest

    const result = await verifyProjectAccess(req, 'read')

    expect(result).toEqual(fakeProject)
    expect(mockPrisma.project.findFirst).toHaveBeenCalledTimes(1)
  })

  it('attaches project to req.project', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(fakeProject)
    const req = mockRequest({ params: { projectId: 'project-1' } }) as ProjectRequest

    await verifyProjectAccess(req, 'read')

    expect(req.project).toEqual(fakeProject)
  })

  it('throws AppError 400 when no projectId found', async () => {
    const req = mockRequest({ params: {}, query: {}, body: {} }) as ProjectRequest

    try {
      await verifyProjectAccess(req, 'read')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).statusCode).toBe(400)
      expect((e as AppError).message).toBe('Project ID is required')
    }
  })

  it('throws AppError 404 when project not found', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(null)
    const req = mockRequest({ params: { projectId: 'nonexistent' } }) as ProjectRequest

    try {
      await verifyProjectAccess(req, 'read')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).statusCode).toBe(404)
    }
  })

  it('reads projectId from req.params.projectId first', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(fakeProject)
    const req = mockRequest({
      params: { projectId: 'from-params' },
      query: { projectId: 'from-query' },
      body: { projectId: 'from-body' },
    }) as ProjectRequest

    await verifyProjectAccess(req, 'read')

    expect(mockPrisma.project.findFirst.mock.calls[0][0].where.id).toBe('from-params')
  })

  it('reads projectId from req.query when params missing', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(fakeProject)
    const req = mockRequest({
      params: {},
      query: { projectId: 'from-query' },
      body: { projectId: 'from-body' },
    }) as ProjectRequest

    await verifyProjectAccess(req, 'read')

    expect(mockPrisma.project.findFirst.mock.calls[0][0].where.id).toBe('from-query')
  })

  it('reads projectId from req.body as last resort', async () => {
    mockPrisma.project.findFirst.mockResolvedValueOnce(fakeProject)
    const req = mockRequest({
      params: {},
      query: {},
      body: { projectId: 'from-body' },
    }) as ProjectRequest

    await verifyProjectAccess(req, 'read')

    expect(mockPrisma.project.findFirst.mock.calls[0][0].where.id).toBe('from-body')
  })
})

describe('verifyResourceAccess', () => {
  const fakeResource = { id: 'resource-1', title: 'Finding', projectId: 'project-1' }

  it('returns the resource when found', async () => {
    const mockModel = { findFirst: vi.fn().mockResolvedValueOnce(fakeResource) }

    const result = await verifyResourceAccess('test-user-id', 'resource-1', mockModel, 'write')

    expect(result).toEqual(fakeResource)
    expect(mockModel.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'resource-1', project: expect.any(Object) }),
      })
    )
  })

  it('throws AppError 404 when resource not found', async () => {
    const mockModel = { findFirst: vi.fn().mockResolvedValueOnce(null) }

    try {
      await verifyResourceAccess('test-user-id', 'nonexistent', mockModel, 'write')
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      expect((e as AppError).statusCode).toBe(404)
    }
  })
})
