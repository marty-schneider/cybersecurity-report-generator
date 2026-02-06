import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyResourceAccess, verifyProjectAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { cveService } from '../services/cveService.js'

export const lookupCVE = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const cveId = req.query.cveId as string
    if (!cveId || !/^CVE-\d{4}-\d{4,}$/i.test(cveId)) {
      throw new AppError('Valid CVE ID is required (e.g., CVE-2021-44228)', 400)
    }

    const data = await cveService.lookupCVE(cveId.toUpperCase())
    if (!data) {
      throw new AppError(`CVE ${cveId} not found in NVD`, 404)
    }

    res.json(data)
  } catch (error) {
    next(error)
  }
}

export const enrichFinding = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    await verifyResourceAccess(userId, id, prisma.finding, 'write')

    const cveData = await cveService.enrichFinding(id)
    if (!cveData) {
      throw new AppError('No CVE pattern found in this finding or CVE not found in NVD', 404)
    }

    const updated = await prisma.finding.findUnique({ where: { id } })
    res.json({ cveData, finding: updated })
  } catch (error) {
    next(error)
  }
}

export const enrichProject = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyProjectAccess(req, 'write')
    const projectId = req.params.projectId

    const findings = await prisma.finding.findMany({
      where: { projectId, cveEnrichedAt: null },
    })

    let enriched = 0
    const results: Array<{ findingId: string; cveId: string; success: boolean }> = []

    for (const finding of findings) {
      const cveId = finding.cveId || cveService.extractCVE(finding.title) || cveService.extractCVE(finding.description)
      if (!cveId) continue

      const data = await cveService.enrichFinding(finding.id)
      results.push({ findingId: finding.id, cveId, success: !!data })
      if (data) enriched++

      // Rate limit: NVD API allows ~5 req/30s without key
      await new Promise((resolve) => setTimeout(resolve, 6000))
    }

    res.json({ enriched, total: findings.length, results })
  } catch (error) {
    next(error)
  }
}
