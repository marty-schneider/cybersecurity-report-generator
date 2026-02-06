import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'

// Get all project IDs accessible by the current user
async function getUserProjectIds(userId: string): Promise<string[]> {
  const owned = await prisma.project.findMany({
    where: { createdBy: userId },
    select: { id: true },
  })
  const memberOf = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  })
  const ids = new Set([
    ...owned.map(p => p.id),
    ...memberOf.map(m => m.projectId),
  ])
  return Array.from(ids)
}

export const getOverviewStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const [projectCount, activeCount, findingCount, iocCount, ttpCount, reportCount, criticalCount] = await Promise.all([
      prisma.project.count({ where: { id: { in: projectIds } } }),
      prisma.project.count({ where: { id: { in: projectIds }, status: 'ACTIVE' } }),
      prisma.finding.count({ where: { projectId: { in: projectIds } } }),
      prisma.iOC.count({ where: { projectId: { in: projectIds } } }),
      prisma.tTPMapping.count({ where: { projectId: { in: projectIds } } }),
      prisma.report.count({ where: { projectId: { in: projectIds } } }),
      prisma.finding.count({ where: { projectId: { in: projectIds }, severity: 'CRITICAL' } }),
    ])

    res.json({
      totalProjects: projectCount,
      activeProjects: activeCount,
      totalFindings: findingCount,
      totalIOCs: iocCount,
      totalTTPs: ttpCount,
      totalReports: reportCount,
      criticalFindings: criticalCount,
    })
  } catch (error) {
    next(error)
  }
}

export const getSeverityDistribution = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const distribution = await prisma.finding.groupBy({
      by: ['severity'],
      where: { projectId: { in: projectIds } },
      _count: true,
    })

    const result = distribution.map(d => ({
      severity: d.severity,
      count: d._count,
    }))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const getFindingsOverTime = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)
    const range = (req.query.range as string) || '30d'

    let daysBack = 30
    if (range === '7d') daysBack = 7
    else if (range === '90d') daysBack = 90
    else if (range === '365d') daysBack = 365

    const since = new Date()
    since.setDate(since.getDate() - daysBack)

    const findings = await prisma.finding.findMany({
      where: {
        projectId: { in: projectIds },
        createdAt: { gte: since },
      },
      select: { createdAt: true, severity: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group by date
    const byDate: Record<string, Record<string, number>> = {}
    for (const f of findings) {
      const date = f.createdAt.toISOString().split('T')[0]
      if (!byDate[date]) byDate[date] = {}
      byDate[date][f.severity] = (byDate[date][f.severity] || 0) + 1
    }

    const result = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const getIOCTypeBreakdown = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const breakdown = await prisma.iOC.groupBy({
      by: ['type'],
      where: { projectId: { in: projectIds } },
      _count: true,
    })

    const result = breakdown.map(d => ({
      type: d.type,
      count: d._count,
    }))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const getMitreHeatmap = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const ttps = await prisma.tTPMapping.findMany({
      where: { projectId: { in: projectIds } },
      select: { tacticName: true, techniqueName: true, mitreId: true },
    })

    // Group by tactic → technique with count
    const heatmap: Record<string, Array<{ technique: string; mitreId: string; count: number }>> = {}
    const techniqueCount: Record<string, number> = {}

    for (const ttp of ttps) {
      const key = `${ttp.tacticName}:${ttp.mitreId}`
      techniqueCount[key] = (techniqueCount[key] || 0) + 1
    }

    for (const ttp of ttps) {
      if (!heatmap[ttp.tacticName]) heatmap[ttp.tacticName] = []
      const key = `${ttp.tacticName}:${ttp.mitreId}`
      const existing = heatmap[ttp.tacticName].find(t => t.mitreId === ttp.mitreId)
      if (!existing) {
        heatmap[ttp.tacticName].push({
          technique: ttp.techniqueName,
          mitreId: ttp.mitreId,
          count: techniqueCount[key],
        })
      }
    }

    res.json(heatmap)
  } catch (error) {
    next(error)
  }
}

export const getStatusDistribution = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const distribution = await prisma.finding.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: true,
    })

    const result = distribution.map(d => ({
      status: d.status,
      count: d._count,
    }))

    res.json(result)
  } catch (error) {
    next(error)
  }
}

export const getRiskPosture = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.id
    const projectIds = await getUserProjectIds(userId)

    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        _count: {
          select: { findings: true },
        },
      },
    })

    // For each project, get severity breakdown
    const result = await Promise.all(
      projects.map(async (project) => {
        const severities = await prisma.finding.groupBy({
          by: ['severity'],
          where: { projectId: project.id },
          _count: true,
        })
        const counts: Record<string, number> = {}
        for (const s of severities) {
          counts[s.severity] = s._count
        }
        return {
          projectId: project.id,
          projectName: project.name,
          totalFindings: project._count.findings,
          ...counts,
        }
      })
    )

    res.json(result)
  } catch (error) {
    next(error)
  }
}
