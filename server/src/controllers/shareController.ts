import { Request, Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import bcrypt from 'bcrypt'
import { reportGenerationService } from '../services/reportGenerationService.js'

export const createShareLink = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { reportId, password, expiresInDays, maxViews } = req.body

    if (!reportId) throw new AppError('reportId is required', 400)

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { project: true },
    })
    if (!report) throw new AppError('Report not found', 404)

    // Verify user has access to the project
    const hasAccess = await prisma.project.findFirst({
      where: {
        id: report.projectId,
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
    })
    if (!hasAccess) throw new AppError('Access denied', 403)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 7))

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const shareLink = await prisma.shareLink.create({
      data: {
        reportId,
        password: hashedPassword,
        expiresAt,
        maxViews: maxViews || null,
        createdBy: userId,
      },
    })

    res.status(201).json({
      id: shareLink.id,
      token: shareLink.token,
      expiresAt: shareLink.expiresAt,
      maxViews: shareLink.maxViews,
      hasPassword: !!password,
      url: `/shared/${shareLink.token}`,
    })
  } catch (error) {
    next(error)
  }
}

export const revokeShareLink = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const link = await prisma.shareLink.findUnique({ where: { id } })
    if (!link) throw new AppError('Share link not found', 404)
    if (link.createdBy !== userId) throw new AppError('Access denied', 403)

    await prisma.shareLink.update({
      where: { id },
      data: { isActive: false },
    })

    res.json({ message: 'Share link revoked' })
  } catch (error) {
    next(error)
  }
}

export const listShareLinks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { reportId } = req.params

    const links = await prisma.shareLink.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        expiresAt: true,
        maxViews: true,
        viewCount: true,
        isActive: true,
        password: false,
        createdAt: true,
      },
    })

    res.json(links.map(l => ({
      ...l,
      hasPassword: false, // password field excluded
      isExpired: new Date() > l.expiresAt,
      url: `/shared/${l.token}`,
    })))
  } catch (error) {
    next(error)
  }
}

// PUBLIC endpoint — no auth required
export const viewSharedReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params

    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        report: {
          include: { project: { select: { id: true, name: true } } },
        },
      },
    })

    if (!link) throw new AppError('Share link not found', 404)
    if (!link.isActive) throw new AppError('This share link has been revoked', 410)
    if (new Date() > link.expiresAt) throw new AppError('This share link has expired', 410)
    if (link.maxViews && link.viewCount >= link.maxViews) {
      throw new AppError('This share link has reached its view limit', 410)
    }

    // Check if password is required
    if (link.password) {
      throw new AppError('Password required', 401)
    }

    // Increment view count and generate report
    await prisma.shareLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    })

    const html = await reportGenerationService.generateReport(link.report.projectId)
    res.json({ html, projectName: link.report.project.name })
  } catch (error) {
    next(error)
  }
}

// PUBLIC endpoint — verify password and view
export const verifyAndViewSharedReport = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params
    const { password } = req.body

    if (!password) throw new AppError('Password is required', 400)

    const link = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        report: {
          include: { project: { select: { id: true, name: true } } },
        },
      },
    })

    if (!link) throw new AppError('Share link not found', 404)
    if (!link.isActive) throw new AppError('This share link has been revoked', 410)
    if (new Date() > link.expiresAt) throw new AppError('This share link has expired', 410)
    if (link.maxViews && link.viewCount >= link.maxViews) {
      throw new AppError('This share link has reached its view limit', 410)
    }

    if (link.password) {
      const valid = await bcrypt.compare(password, link.password)
      if (!valid) throw new AppError('Incorrect password', 401)
    }

    await prisma.shareLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } },
    })

    const html = await reportGenerationService.generateReport(link.report.projectId)
    res.json({ html, projectName: link.report.project.name })
  } catch (error) {
    next(error)
  }
}
