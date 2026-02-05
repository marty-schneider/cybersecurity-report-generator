import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyProjectAccess, verifyResourceAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { Prisma } from '@prisma/client'

export const getFindings = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyProjectAccess(req, 'read')

    const projectId = (req.query.projectId ?? req.body.projectId) as string

    const findings = await prisma.finding.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { severity: 'asc' }, // CRITICAL first
        { createdAt: 'desc' },
      ],
    })

    res.json(findings)
  } catch (error) {
    next(error)
  }
}

export const getFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const finding = await verifyResourceAccess(userId, id, prisma.finding, 'read')

    res.json(finding)
  } catch (error) {
    next(error)
  }
}

export const createFinding = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      projectId,
      title,
      description,
      severity,
      cvssScore,
      affectedSystems,
      evidence,
      remediation,
      assignedTo,
    } = req.body

    if (!title || !description || !severity || !remediation) {
      throw new AppError(
        'Title, description, severity, and remediation are required',
        400
      )
    }

    await verifyProjectAccess(req, 'write')

    const finding = await prisma.finding.create({
      data: {
        projectId,
        title,
        description,
        severity,
        cvssScore: cvssScore ? parseFloat(cvssScore) : null,
        affectedSystems: affectedSystems || [],
        evidence,
        remediation,
        assignedTo,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json(finding)
  } catch (error) {
    next(error)
  }
}

export const updateFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const {
      title,
      description,
      severity,
      cvssScore,
      affectedSystems,
      evidence,
      remediation,
      status,
      assignedTo,
    } = req.body

    await verifyResourceAccess(userId, id, prisma.finding, 'write')

    const updateData: Prisma.FindingUpdateInput = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (severity) updateData.severity = severity
    if (cvssScore !== undefined) updateData.cvssScore = cvssScore ? parseFloat(cvssScore) : null
    if (affectedSystems) updateData.affectedSystems = affectedSystems
    if (evidence !== undefined) updateData.evidence = evidence
    if (remediation) updateData.remediation = remediation
    if (status) updateData.status = status
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    const finding = await prisma.finding.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json(finding)
  } catch (error) {
    next(error)
  }
}

export const deleteFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    await verifyResourceAccess(userId, id, prisma.finding, 'write')

    await prisma.finding.delete({ where: { id } })

    res.json({ message: 'Finding deleted successfully' })
  } catch (error) {
    next(error)
  }
}
