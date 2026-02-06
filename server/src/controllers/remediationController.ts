import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyResourceAccess } from '../middleware/projectAccess.js'
import { verifyProjectAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { auditService } from '../services/auditService.js'
import { notificationService } from '../services/notificationService.js'
import { FindingStatus } from '@prisma/client'

const VALID_TRANSITIONS: Record<string, FindingStatus[]> = {
  NEW: ['IN_REVIEW', 'ACCEPTED_RISK'],
  IN_REVIEW: ['VERIFIED', 'ACCEPTED_RISK', 'NEW'],
  VERIFIED: ['REMEDIATION_PLANNED', 'ACCEPTED_RISK'],
  REMEDIATION_PLANNED: ['RETEST_PENDING', 'VERIFIED'],
  RETEST_PENDING: ['REMEDIATED', 'REMEDIATION_PLANNED', 'VERIFIED'],
  REMEDIATED: ['MITIGATED', 'RETEST_PENDING'],
  ACCEPTED_RISK: ['IN_REVIEW'],
  MITIGATED: [],
}

export const updateRemediationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params
    const userId = req.user!.id
    const {
      status,
      remediationAssignedDate,
      remediationTargetDate,
      retestDate,
      verifiedDate,
      riskAcceptanceNote,
    } = req.body

    const finding = await verifyResourceAccess(userId, findingId, prisma.finding, 'write')

    // Validate status transition
    if (status) {
      const allowed = VALID_TRANSITIONS[finding.status]
      if (!allowed || !allowed.includes(status)) {
        throw new AppError(
          `Invalid status transition: ${finding.status} → ${status}. Allowed: ${(allowed || []).join(', ')}`,
          400
        )
      }

      // Validate required fields for certain statuses
      if (status === 'RETEST_PENDING' && !retestDate && !finding.retestDate) {
        throw new AppError('Retest date is required for RETEST_PENDING status', 400)
      }
      if (status === 'ACCEPTED_RISK' && !riskAcceptanceNote && !finding.riskAcceptanceNote) {
        throw new AppError('Risk acceptance note is required for ACCEPTED_RISK status', 400)
      }
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (remediationAssignedDate !== undefined)
      updateData.remediationAssignedDate = remediationAssignedDate ? new Date(remediationAssignedDate) : null
    if (remediationTargetDate !== undefined)
      updateData.remediationTargetDate = remediationTargetDate ? new Date(remediationTargetDate) : null
    if (retestDate !== undefined)
      updateData.retestDate = retestDate ? new Date(retestDate) : null
    if (verifiedDate !== undefined)
      updateData.verifiedDate = verifiedDate ? new Date(verifiedDate) : null
    if (riskAcceptanceNote !== undefined)
      updateData.riskAcceptanceNote = riskAcceptanceNote

    const updated = await prisma.finding.update({
      where: { id: findingId },
      data: updateData,
      include: { remediationNotes: { include: { author: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } } },
    })

    auditService.log({
      userId,
      projectId: updated.projectId,
      action: 'UPDATE',
      entityType: 'Finding',
      entityId: findingId,
      details: { remediation: updateData },
      req,
    })

    if (status) {
      notificationService.notifyProjectMembers(finding.projectId, userId, {
        type: 'FINDING_STATUS_CHANGED',
        title: 'Finding Status Updated',
        message: `"${finding.title}" status changed to ${status.replace(/_/g, ' ')}.`,
        entityType: 'Finding',
        entityId: findingId,
      })
    }

    res.json(updated)
  } catch (error) {
    next(error)
  }
}

export const addRemediationNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params
    const userId = req.user!.id
    const { note } = req.body

    if (!note || !note.trim()) {
      throw new AppError('Note text is required', 400)
    }

    const finding = await verifyResourceAccess(userId, findingId, prisma.finding, 'write')

    const created = await prisma.remediationNote.create({
      data: {
        findingId,
        note: note.trim(),
        createdBy: userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    auditService.log({
      userId,
      projectId: finding.projectId,
      action: 'CREATE',
      entityType: 'RemediationNote',
      entityId: created.id,
      req,
    })

    res.status(201).json(created)
  } catch (error) {
    next(error)
  }
}

export const getTimeline = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params
    const userId = req.user!.id

    await verifyResourceAccess(userId, findingId, prisma.finding, 'read')

    const finding = await prisma.finding.findUnique({
      where: { id: findingId },
      include: {
        remediationNotes: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!finding) {
      throw new AppError('Finding not found', 404)
    }

    // Combine key dates with notes into a timeline
    const timeline: Array<{ type: string; date: string; detail: string; user?: { id: string; name: string; email: string } }> = []

    if (finding.createdAt) {
      timeline.push({ type: 'created', date: finding.createdAt.toISOString(), detail: 'Finding created' })
    }
    if (finding.remediationAssignedDate) {
      timeline.push({ type: 'assigned', date: finding.remediationAssignedDate.toISOString(), detail: 'Remediation assigned' })
    }
    if (finding.remediationTargetDate) {
      timeline.push({ type: 'target', date: finding.remediationTargetDate.toISOString(), detail: 'Target remediation date' })
    }
    if (finding.retestDate) {
      timeline.push({ type: 'retest', date: finding.retestDate.toISOString(), detail: 'Retest scheduled' })
    }
    if (finding.verifiedDate) {
      timeline.push({ type: 'verified', date: finding.verifiedDate.toISOString(), detail: 'Remediation verified' })
    }

    for (const n of finding.remediationNotes) {
      timeline.push({ type: 'note', date: n.createdAt.toISOString(), detail: n.note, user: n.author })
    }

    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    res.json({ finding, timeline })
  } catch (error) {
    next(error)
  }
}

export const getProjectRemediationDashboard = async (
  req: ProjectRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    await verifyProjectAccess(req, 'read')
    const projectId = req.params.projectId

    const findings = await prisma.finding.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        remediationTargetDate: true,
        retestDate: true,
        verifiedDate: true,
        createdAt: true,
      },
      orderBy: { severity: 'asc' },
    })

    const now = new Date()

    // Status counts
    const statusCounts: Record<string, number> = {}
    for (const f of findings) {
      statusCounts[f.status] = (statusCounts[f.status] || 0) + 1
    }

    // Overdue findings (target date passed but not remediated/mitigated/accepted)
    const overdue = findings.filter(
      (f) =>
        f.remediationTargetDate &&
        new Date(f.remediationTargetDate) < now &&
        !['REMEDIATED', 'MITIGATED', 'ACCEPTED_RISK'].includes(f.status)
    )

    // Upcoming retests (within next 14 days)
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const upcomingRetests = findings.filter(
      (f) =>
        f.retestDate &&
        new Date(f.retestDate) >= now &&
        new Date(f.retestDate) <= twoWeeks &&
        f.status === 'RETEST_PENDING'
    )

    res.json({
      statusCounts,
      totalFindings: findings.length,
      overdue,
      upcomingRetests,
      findings,
    })
  } catch (error) {
    next(error)
  }
}
