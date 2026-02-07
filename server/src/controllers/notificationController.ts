import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'

export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const unreadOnly = req.query.unreadOnly === 'true'

    const where: any = { userId }
    if (unreadOnly) where.isRead = false

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ])

    res.json({
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
}

export const getUnreadCount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    })
    res.json({ count })
  } catch (error) {
    next(error)
  }
}

export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const notification = await prisma.notification.findUnique({ where: { id } })
    if (!notification) throw new AppError('Notification not found', 404)
    if (notification.userId !== userId) throw new AppError('Access denied', 403)

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    })

    res.json({ message: 'Marked as read' })
  } catch (error) {
    next(error)
  }
}

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    next(error)
  }
}
