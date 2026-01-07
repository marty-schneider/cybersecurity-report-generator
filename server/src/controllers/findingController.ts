import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'

export const getFindings = async (
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

    const findings = await prisma.finding.findMany({
      where: { projectId: projectId as string },
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

    const finding = await prisma.finding.findFirst({
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
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!finding) {
      throw new AppError('Finding not found', 404)
    }

    res.json(finding)
  } catch (error) {
    next(error)
  }
}

export const createFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
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

    if (!projectId || !title || !description || !severity || !remediation) {
      throw new AppError(
        'Project ID, title, description, severity, and remediation are required',
        400
      )
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

    // Verify user has access
    const existing = await prisma.finding.findFirst({
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
      throw new AppError('Finding not found or insufficient permissions', 404)
    }

    const updateData: any = {}
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

    // Verify user has access
    const existing = await prisma.finding.findFirst({
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
      throw new AppError('Finding not found or insufficient permissions', 404)
    }

    await prisma.finding.delete({ where: { id } })

    res.json({ message: 'Finding deleted successfully' })
  } catch (error) {
    next(error)
  }
}
