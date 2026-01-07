import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { aiAnalysisService } from '../services/aiAnalysisService.js'
import { mitreAttackService } from '../services/mitreAttackService.js'
import { logger } from '../utils/logger.js'

export const getTTPs = async (
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

    const ttps = await prisma.tTPMapping.findMany({
      where: { projectId: projectId as string },
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
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.body
    const userId = req.user!.id

    if (!projectId) {
      throw new AppError('Project ID is required', 400)
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
      include: {
        name: true,
        clientName: true,
        assessmentType: true,
      },
    })

    if (!project) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

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

        // Extract IOC IDs mentioned in the reasoning (simplified approach)
        const iocIds = iocs
          .filter((ioc) => ttp.reasoning.toLowerCase().includes(ioc.value.toLowerCase()))
          .map((ioc) => ioc.id)

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

    // Return complete analysis result
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
  req: AuthRequest,
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

    // Verify user has access
    const existing = await prisma.tTPMapping.findFirst({
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
      throw new AppError('TTP mapping not found or insufficient permissions', 404)
    }

    await prisma.tTPMapping.delete({ where: { id } })

    res.json({ message: 'TTP mapping deleted successfully' })
  } catch (error) {
    next(error)
  }
}
