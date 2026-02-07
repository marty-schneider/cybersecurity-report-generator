import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma, Severity } from '@prisma/client'

export const listTemplates = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { search, category, severity } = req.query

    const where: Prisma.FindingTemplateWhereInput = {}

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { tags: { has: search as string } },
      ]
    }
    if (category) where.category = category as string
    if (severity) where.severity = severity as Severity

    const templates = await prisma.findingTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { severity: 'asc' }, { title: 'asc' }],
    })

    res.json(templates)
  } catch (error) {
    next(error)
  }
}

export const getTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const template = await prisma.findingTemplate.findUnique({ where: { id } })
    if (!template) throw new AppError('Template not found', 404)

    res.json(template)
  } catch (error) {
    next(error)
  }
}

export const createTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const { title, description, severity, cvssScore, category, remediation, references, tags } = req.body

    if (!title || !description || !severity || !category || !remediation) {
      throw new AppError('Title, description, severity, category, and remediation are required', 400)
    }

    const template = await prisma.findingTemplate.create({
      data: {
        title,
        description,
        severity,
        cvssScore: cvssScore ? parseFloat(cvssScore) : null,
        category,
        remediation,
        references: references || [],
        tags: tags || [],
        isBuiltIn: false,
        createdBy: userId,
      },
    })

    res.status(201).json(template)
  } catch (error) {
    next(error)
  }
}

export const updateTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const existing = await prisma.findingTemplate.findUnique({ where: { id } })
    if (!existing) throw new AppError('Template not found', 404)
    if (existing.isBuiltIn && req.user!.role !== 'ADMIN') {
      throw new AppError('Only admins can edit built-in templates', 403)
    }
    if (!existing.isBuiltIn && existing.createdBy !== userId) {
      throw new AppError('You can only edit templates you created', 403)
    }

    const { title, description, severity, cvssScore, category, remediation, references, tags } = req.body
    const updateData: Prisma.FindingTemplateUpdateInput = {}
    if (title) updateData.title = title
    if (description) updateData.description = description
    if (severity) updateData.severity = severity
    if (cvssScore !== undefined) updateData.cvssScore = cvssScore ? parseFloat(cvssScore) : null
    if (category) updateData.category = category
    if (remediation) updateData.remediation = remediation
    if (references) updateData.references = references
    if (tags) updateData.tags = tags

    const updated = await prisma.findingTemplate.update({ where: { id }, data: updateData })
    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const deleteTemplate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const existing = await prisma.findingTemplate.findUnique({ where: { id } })
    if (!existing) throw new AppError('Template not found', 404)
    if (existing.isBuiltIn) throw new AppError('Cannot delete built-in templates', 403)

    await prisma.findingTemplate.delete({ where: { id } })
    res.json({ message: 'Template deleted' })
  } catch (error) {
    next(error)
  }
}

export const getCategories = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.findingTemplate.findMany({
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    res.json(categories.map(c => c.category))
  } catch (error) {
    next(error)
  }
}
