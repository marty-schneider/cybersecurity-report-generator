import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'

export const getIOCs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.query
    const userId = req.user!.id

    if (!projectId) {
      throw new AppError('Project ID is required', 400)
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId as string,
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or access denied', 404)
    }

    const iocs = await prisma.iOC.findMany({
      where: { projectId: projectId as string },
      orderBy: {
        timestamp: 'desc',
      },
    })

    res.json(iocs)
  } catch (error) {
    next(error)
  }
}

export const getIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const ioc = await prisma.iOC.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId } } },
          ],
        },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!ioc) {
      throw new AppError('IOC not found', 404)
    }

    res.json(ioc)
  } catch (error) {
    next(error)
  }
}

export const createIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { projectId, type, value, timestamp, context, source } = req.body

    if (!projectId || !type || !value || !timestamp) {
      throw new AppError('Project ID, type, value, and timestamp are required', 400)
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    const ioc = await prisma.iOC.create({
      data: {
        projectId,
        type,
        value,
        timestamp: new Date(timestamp),
        context,
        source,
      },
    })

    res.status(201).json(ioc)
  } catch (error) {
    next(error)
  }
}

export const bulkCreateIOCs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { projectId, iocs } = req.body

    if (!projectId || !iocs || !Array.isArray(iocs) || iocs.length === 0) {
      throw new AppError('Project ID and array of IOCs are required', 400)
    }

    // Verify user has access to project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    })

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    // Validate all IOCs
    for (const ioc of iocs) {
      if (!ioc.type || !ioc.value || !ioc.timestamp) {
        throw new AppError('Each IOC must have type, value, and timestamp', 400)
      }
    }

    // Create all IOCs
    const createdIOCs = await prisma.iOC.createMany({
      data: iocs.map((ioc: any) => ({
        projectId,
        type: ioc.type,
        value: ioc.value,
        timestamp: new Date(ioc.timestamp),
        context: ioc.context,
        source: ioc.source,
      })),
    })

    res.status(201).json({
      message: `Successfully created ${createdIOCs.count} IOCs`,
      count: createdIOCs.count
    })
  } catch (error) {
    next(error)
  }
}

export const updateIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { type, value, timestamp, context, source, enrichmentData } = req.body

    // Verify user has access
    const existing = await prisma.iOC.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    })

    if (!existing) {
      throw new AppError('IOC not found or insufficient permissions', 404)
    }

    const updateData: any = {}
    if (type) updateData.type = type
    if (value) updateData.value = value
    if (timestamp) updateData.timestamp = new Date(timestamp)
    if (context !== undefined) updateData.context = context
    if (source !== undefined) updateData.source = source
    if (enrichmentData !== undefined) updateData.enrichmentData = enrichmentData

    const ioc = await prisma.iOC.update({
      where: { id },
      data: updateData,
    })

    res.json(ioc)
  } catch (error) {
    next(error)
  }
}

export const deleteIOC = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Verify user has access
    const existing = await prisma.iOC.findFirst({
      where: {
        id,
        project: {
          OR: [
            { createdBy: userId },
            { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
          ],
        },
      },
    })

    if (!existing) {
      throw new AppError('IOC not found or insufficient permissions', 404)
    }

    await prisma.iOC.delete({ where: { id } })

    res.json({ message: 'IOC deleted successfully' })
  } catch (error) {
    next(error)
  }
}
