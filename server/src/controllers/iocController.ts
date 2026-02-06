import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyProjectAccess, verifyResourceAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { Prisma, IOCType } from '@prisma/client'

export const getIOCs = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyProjectAccess(req, 'read')

    const projectId = (req.query.projectId ?? req.body.projectId) as string

    const iocs = await prisma.iOC.findMany({
      where: { projectId },
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

    const ioc = await verifyResourceAccess(userId, id, prisma.iOC, 'read')

    res.json(ioc)
  } catch (error) {
    next(error)
  }
}

export const createIOC = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, type, value, timestamp, context, source } = req.body

    if (!type || !value || !timestamp) {
      throw new AppError('Type, value, and timestamp are required', 400)
    }

    await verifyProjectAccess(req, 'write')

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
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, iocs } = req.body

    if (!iocs || !Array.isArray(iocs) || iocs.length === 0) {
      throw new AppError('Array of IOCs is required', 400)
    }

    await verifyProjectAccess(req, 'write')

    // Validate all IOCs
    for (const ioc of iocs) {
      if (!ioc.type || !ioc.value || !ioc.timestamp) {
        throw new AppError('Each IOC must have type, value, and timestamp', 400)
      }
    }

    const createdIOCs = await prisma.iOC.createMany({
      data: iocs.map((ioc: { type: string; value: string; timestamp: string; context?: string; source?: string }) => ({
        projectId,
        type: ioc.type as IOCType,
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

    await verifyResourceAccess(userId, id, prisma.iOC, 'write')

    const updateData: Prisma.IOCUpdateInput = {}
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

    await verifyResourceAccess(userId, id, prisma.iOC, 'write')

    await prisma.iOC.delete({ where: { id } })

    res.json({ message: 'IOC deleted successfully' })
  } catch (error) {
    next(error)
  }
}

export const mapIOCColumns = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { headers, sampleData } = req.body

    if (!headers || !Array.isArray(headers) || headers.length === 0) {
      throw new AppError('Headers array is required', 400)
    }

    if (!sampleData || !Array.isArray(sampleData)) {
      throw new AppError('Sample data array is required', 400)
    }

    const { aiAnalysisService } = await import('../services/aiAnalysisService.js')

    const mapping = await aiAnalysisService.mapColumns(headers, sampleData)

    res.json(mapping)
  } catch (error) {
    next(error)
  }
}
