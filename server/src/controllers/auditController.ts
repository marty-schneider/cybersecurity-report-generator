import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { ProjectRequest, verifyProjectAccess } from '../middleware/projectAccess.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma } from '@prisma/client'

export const getProjectAuditLog = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const projectId = req.params.projectId as string
    req.body.projectId = projectId
    await verifyProjectAccess(req, 'read')

    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    // Build filters
    const where: Prisma.AuditLogWhereInput = { projectId }

    if (req.query.action) {
      where.action = req.query.action as Prisma.EnumAuditActionFilter
    }
    if (req.query.entityType) {
      where.entityType = req.query.entityType as string
    }
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {}
      if (req.query.startDate) {
        where.createdAt.gte = new Date(req.query.startDate as string)
      }
      if (req.query.endDate) {
        where.createdAt.lte = new Date(req.query.endDate as string)
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
}

export const getUserAuditLog = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403)
    }

    const { userId } = req.params
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50))
    const skip = (page - 1) * limit

    const where: Prisma.AuditLogWhereInput = { userId }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
}
