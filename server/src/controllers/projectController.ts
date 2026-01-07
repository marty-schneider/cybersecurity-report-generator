import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'

export const getAllProjects = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            findings: true,
            iocs: true,
            ttpMappings: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    res.json(projects)
  } catch (error) {
    next(error)
  }
}

export const getProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const project = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            project: false,
          },
        },
        findings: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        iocs: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 50,
        },
        ttpMappings: true,
        _count: {
          select: {
            findings: true,
            iocs: true,
            ttpMappings: true,
            reports: true,
          },
        },
      },
    })

    if (!project) {
      throw new AppError('Project not found', 404)
    }

    res.json(project)
  } catch (error) {
    next(error)
  }
}

export const createProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { name, clientName, assessmentType, startDate, endDate } = req.body

    if (!name || !clientName || !assessmentType || !startDate) {
      throw new AppError('Name, client name, assessment type, and start date are required', 400)
    }

    const project = await prisma.project.create({
      data: {
        name,
        clientName,
        assessmentType,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        createdBy: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.status(201).json(project)
  } catch (error) {
    next(error)
  }
}

export const updateProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id
    const { name, clientName, assessmentType, startDate, endDate, status } = req.body

    // Check if user has permission
    const existing = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      },
    })

    if (!existing) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    const updateData: any = {}
    if (name) updateData.name = name
    if (clientName) updateData.clientName = clientName
    if (assessmentType) updateData.assessmentType = assessmentType
    if (startDate) updateData.startDate = new Date(startDate)
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (status) updateData.status = status

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    res.json(project)
  } catch (error) {
    next(error)
  }
}

export const deleteProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user is owner
    const existing = await prisma.project.findFirst({
      where: {
        id,
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: 'OWNER' } } },
        ],
      },
    })

    if (!existing) {
      throw new AppError('Project not found or insufficient permissions', 404)
    }

    await prisma.project.delete({ where: { id } })

    res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    next(error)
  }
}
