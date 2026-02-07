import { vi } from 'vitest'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../notificationController.js'
import { AppError } from '../../middleware/errorHandler.js'
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/express.js'
import { mockPrisma } from '../../__mocks__/prisma.js'

describe('getNotifications', () => {
  it('returns paginated notifications', async () => {
    const notifications = [
      { id: 'n1', title: 'Test', isRead: false, createdAt: new Date() },
      { id: 'n2', title: 'Test 2', isRead: true, createdAt: new Date() },
    ]
    mockPrisma.notification.findMany.mockResolvedValueOnce(notifications)
    mockPrisma.notification.count.mockResolvedValueOnce(2)

    const req = mockRequest({ query: { page: '1', limit: '20' } })
    const res = mockResponse()
    const next = mockNext()

    await getNotifications(req, res, next)

    expect(res._json).toMatchObject({
      notifications,
      total: 2,
      page: 1,
      totalPages: 1,
    })
  })

  it('respects unreadOnly filter', async () => {
    mockPrisma.notification.findMany.mockResolvedValueOnce([])
    mockPrisma.notification.count.mockResolvedValueOnce(0)

    const req = mockRequest({ query: { unreadOnly: 'true' } })
    const res = mockResponse()
    const next = mockNext()

    await getNotifications(req, res, next)

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'test-user-id', isRead: false }),
      })
    )
  })
})

describe('getUnreadCount', () => {
  it('returns count for current user', async () => {
    mockPrisma.notification.count.mockResolvedValueOnce(5)

    const req = mockRequest()
    const res = mockResponse()
    const next = mockNext()

    await getUnreadCount(req, res, next)

    expect(res._json).toEqual({ count: 5 })
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'test-user-id', isRead: false },
    })
  })
})

describe('markAsRead', () => {
  it('marks notification as read', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce({
      id: 'n1',
      userId: 'test-user-id',
    })
    mockPrisma.notification.update.mockResolvedValueOnce({})

    const req = mockRequest({ params: { id: 'n1' } })
    const res = mockResponse()
    const next = mockNext()

    await markAsRead(req, res, next)

    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: expect.objectContaining({ isRead: true }),
    })
    expect(res._json).toMatchObject({ message: 'Marked as read' })
  })

  it('returns 404 for missing notification', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce(null)

    const req = mockRequest({ params: { id: 'nonexistent' } })
    const res = mockResponse()
    const next = mockNext()

    await markAsRead(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(404)
  })

  it('returns 403 for other user notification', async () => {
    mockPrisma.notification.findUnique.mockResolvedValueOnce({
      id: 'n1',
      userId: 'other-user',
    })

    const req = mockRequest({ params: { id: 'n1' } })
    const res = mockResponse()
    const next = mockNext()

    await markAsRead(req, res, next)

    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(403)
  })
})

describe('markAllAsRead', () => {
  it('updates all unread notifications for current user', async () => {
    mockPrisma.notification.updateMany.mockResolvedValueOnce({ count: 3 })

    const req = mockRequest()
    const res = mockResponse()
    const next = mockNext()

    await markAllAsRead(req, res, next)

    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'test-user-id', isRead: false },
      data: expect.objectContaining({ isRead: true }),
    })
    expect(res._json).toMatchObject({ message: 'All notifications marked as read' })
  })
})
