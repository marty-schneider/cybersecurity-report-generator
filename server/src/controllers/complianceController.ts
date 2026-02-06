import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyProjectAccess } from '../middleware/projectAccess.js'

export const listFrameworks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const frameworks = await prisma.complianceFramework.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { controls: true } },
      },
    })
    res.json(frameworks)
  } catch (error) {
    next(error)
  }
}

export const getControls = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { frameworkId } = req.params
    const { search, category } = req.query

    const where: any = { frameworkId }
    if (search) {
      where.OR = [
        { controlId: { contains: search as string, mode: 'insensitive' } },
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    if (category) where.category = category as string

    const controls = await prisma.complianceControl.findMany({
      where,
      orderBy: { controlId: 'asc' },
    })
    res.json(controls)
  } catch (error) {
    next(error)
  }
}

export const mapFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId, complianceControlId } = req.body
    const { notes } = req.body

    if (!findingId || !complianceControlId) {
      throw new AppError('findingId and complianceControlId are required', 400)
    }

    const finding = await prisma.finding.findUnique({ where: { id: findingId } })
    if (!finding) throw new AppError('Finding not found', 404)

    req.body.projectId = finding.projectId
    await verifyProjectAccess(req, 'write')

    const control = await prisma.complianceControl.findUnique({ where: { id: complianceControlId } })
    if (!control) throw new AppError('Control not found', 404)

    const mapping = await prisma.findingComplianceMapping.upsert({
      where: {
        findingId_complianceControlId: { findingId, complianceControlId },
      },
      create: {
        findingId,
        complianceControlId,
        notes: notes || null,
        isAISuggested: false,
      },
      update: {
        notes: notes || null,
      },
      include: {
        complianceControl: {
          include: { framework: true },
        },
      },
    })

    res.status(201).json(mapping)
  } catch (error) {
    next(error)
  }
}

export const unmapFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params

    const mapping = await prisma.findingComplianceMapping.findUnique({
      where: { id },
      include: { finding: true },
    })
    if (!mapping) throw new AppError('Mapping not found', 404)

    req.body.projectId = mapping.finding.projectId
    await verifyProjectAccess(req, 'write')

    await prisma.findingComplianceMapping.delete({ where: { id } })
    res.json({ message: 'Mapping removed' })
  } catch (error) {
    next(error)
  }
}

export const getFindingMappings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params

    const finding = await prisma.finding.findUnique({ where: { id: findingId } })
    if (!finding) throw new AppError('Finding not found', 404)

    const mappings = await prisma.findingComplianceMapping.findMany({
      where: { findingId },
      include: {
        complianceControl: {
          include: { framework: true },
        },
      },
    })

    res.json(mappings)
  } catch (error) {
    next(error)
  }
}

export const getProjectComplianceSummary = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    await verifyProjectAccess(req, 'read')

    // Get all findings for this project
    const findings = await prisma.finding.findMany({
      where: { projectId },
      select: { id: true },
    })
    const findingIds = findings.map(f => f.id)

    // Get all mappings for these findings
    const mappings = await prisma.findingComplianceMapping.findMany({
      where: { findingId: { in: findingIds } },
      include: {
        complianceControl: {
          include: { framework: true },
        },
        finding: {
          select: { id: true, title: true, severity: true },
        },
      },
    })

    // Get all frameworks
    const frameworks = await prisma.complianceFramework.findMany({
      include: {
        controls: true,
      },
    })

    // Build summary per framework
    const summary = frameworks.map(framework => {
      const frameworkMappings = mappings.filter(
        m => m.complianceControl.frameworkId === framework.id
      )
      const mappedControlIds = new Set(frameworkMappings.map(m => m.complianceControlId))

      return {
        framework: {
          id: framework.id,
          name: framework.name,
          version: framework.version,
          shortCode: framework.shortCode,
        },
        totalControls: framework.controls.length,
        mappedControls: mappedControlIds.size,
        coverage: framework.controls.length > 0
          ? mappedControlIds.size / framework.controls.length
          : 0,
        mappings: frameworkMappings.map(m => ({
          id: m.id,
          controlId: m.complianceControl.controlId,
          controlTitle: m.complianceControl.title,
          finding: m.finding,
          isAISuggested: m.isAISuggested,
          confidence: m.confidence,
          notes: m.notes,
        })),
      }
    })

    res.json(summary)
  } catch (error) {
    next(error)
  }
}
