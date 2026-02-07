import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { aiAnalysisService } from '../services/aiAnalysisService.js'
import { mitreAttackService } from '../services/mitreAttackService.js'
import { logger } from '../utils/logger.js'
import { verifyProjectAccess, verifyResourceAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { IOC } from '@prisma/client'
import { auditService } from '../services/auditService.js'

export const getTTPs = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyProjectAccess(req, 'read')

    const projectId = req.query.projectId as string

    const ttps = await prisma.tTPMapping.findMany({
      where: { projectId },
      orderBy: {
        confidence: 'desc',
      },
    })

    res.json(ttps)
  } catch (error) {
    next(error)
  }
}

export const analyzeTTPs = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = await verifyProjectAccess(req, 'write')
    const projectId = req.body.projectId as string

    // Get all IOCs for the project
    const iocs = await prisma.iOC.findMany({
      where: { projectId },
      orderBy: { timestamp: 'asc' },
    })

    if (iocs.length === 0) {
      throw new AppError('No IOCs found for analysis. Please add IOCs first.', 400)
    }

    logger.info(`Starting TTP analysis for project ${projectId} with ${iocs.length} IOCs`)

    // Perform AI analysis
    const projectContext = `Assessment Type: ${project.assessmentType}\nClient: ${project.clientName}\nProject: ${project.name}`
    const analysis = await aiAnalysisService.analyzeIOCs(iocs, projectContext)

    // Delete existing TTP mappings for this project
    await prisma.tTPMapping.deleteMany({
      where: { projectId },
    })

    // Create new TTP mappings from AI analysis
    const ttpMappings = await Promise.all(
      analysis.ttps.map(async (ttp) => {
        // Validate technique exists in our MITRE database
        const technique = mitreAttackService.getTechnique(ttp.mitreId)

        if (!technique) {
          logger.warn(`Unknown MITRE technique ${ttp.mitreId}, skipping`)
          return null
        }

        // Extract IOC IDs mentioned in the reasoning
        const iocIds = iocs
          .filter((ioc: IOC) => ttp.reasoning.toLowerCase().includes(ioc.value.toLowerCase()))
          .map((ioc: IOC) => ioc.id)

        return prisma.tTPMapping.create({
          data: {
            projectId,
            mitreId: ttp.mitreId,
            tacticName: ttp.tacticName,
            techniqueName: ttp.techniqueName,
            description: ttp.description,
            confidence: ttp.confidence,
            aiAnalysis: ttp.reasoning,
            iocIds: iocIds.length > 0 ? iocIds : [],
          },
        })
      })
    )

    // Filter out null values (invalid techniques)
    const validMappings = ttpMappings.filter((m) => m !== null)

    logger.info(`Created ${validMappings.length} TTP mappings for project ${projectId}`)

    auditService.log({ userId: req.user!.id, projectId, action: 'CREATE', entityType: 'TTPMapping', details: { iocsAnalyzed: iocs.length, ttpsIdentified: validMappings.length }, req })

    res.json({
      success: true,
      analysis: {
        narrative: analysis.narrative,
        timeline: analysis.timeline,
        threatActorProfile: analysis.threatActorProfile,
        recommendations: analysis.recommendations,
      },
      ttpMappings: validMappings,
      stats: {
        iocsAnalyzed: iocs.length,
        ttpsIdentified: validMappings.length,
        tactics: [...new Set(validMappings.map((m) => m?.tacticName))],
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getTTPDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { techniqueId } = req.params

    const technique = mitreAttackService.getTechnique(techniqueId)

    if (!technique) {
      throw new AppError('Technique not found', 404)
    }

    res.json(technique)
  } catch (error) {
    next(error)
  }
}

export const getTTPMatrix = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const matrix = mitreAttackService.getTechniqueMatrix()

    res.json(matrix)
  } catch (error) {
    next(error)
  }
}

export const deleteTTPMapping = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    await verifyResourceAccess(userId, id, prisma.tTPMapping, 'write')

    const deleted = await prisma.tTPMapping.delete({ where: { id } })

    auditService.log({ userId, projectId: deleted.projectId, action: 'DELETE', entityType: 'TTPMapping', entityId: id, req })

    res.json({ message: 'TTP mapping deleted successfully' })
  } catch (error) {
    next(error)
  }
}
