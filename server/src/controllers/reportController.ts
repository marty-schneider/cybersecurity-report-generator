import { Response } from 'express'
import { reportGenerationService } from '../services/reportGenerationService.js'
import { logger } from '../utils/logger.js'
import { prisma } from '../utils/db.js'
import { verifyProjectAccess, ProjectRequest } from '../middleware/projectAccess.js'
import { AuthRequest } from '../middleware/auth.js'
import { auditService } from '../services/auditService.js'
import { notificationService } from '../services/notificationService.js'

export class ReportController {
  /**
   * Generate assessment report for a project
   * POST /api/reports/generate
   */
  async generateReport(req: ProjectRequest, res: Response) {
    try {
      await verifyProjectAccess(req, 'read')
      const projectId = req.body.projectId as string
      const userId = req.user!.id

      logger.info(`Generating report for project ${projectId} by user ${userId}`)

      const reportHtml = await reportGenerationService.generateReport(projectId)

      const report = await prisma.report.create({
        data: {
          projectId,
          templateId: 'default',
          generatedBy: userId,
          exportFormat: 'PDF',
          fileUrl: '',
        },
      })

      auditService.log({ userId, projectId, action: 'EXPORT', entityType: 'Report', entityId: report.id, req })

      notificationService.notifyProjectMembers(projectId, userId, {
        type: 'REPORT_COMPLETED',
        title: 'Report Generated',
        message: `A new report has been generated for the project.`,
        entityType: 'Report',
        entityId: report.id,
      })

      res.json({
        success: true,
        reportId: report.id,
        html: reportHtml,
        generatedAt: report.createdAt,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Report generation error:', error)
      res.status(500).json({
        error: 'Failed to generate report',
        message,
      })
    }
  }

  /**
   * Get existing report
   * GET /api/reports/:id
   */
  async getReport(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user!.id

      const report = await prisma.report.findFirst({
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
          project: true,
        },
      })

      if (!report) {
        return res.status(404).json({ error: 'Report not found or access denied' })
      }

      const reportHtml = await reportGenerationService.generateReport(report.projectId)

      res.json({
        success: true,
        reportId: report.id,
        html: reportHtml,
        project: {
          id: report.project.id,
          name: report.project.name,
          clientName: report.project.clientName,
        },
        generatedAt: report.createdAt,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('Get report error:', error)
      res.status(500).json({
        error: 'Failed to retrieve report',
        message,
      })
    }
  }

  /**
   * List reports for a project
   * GET /api/reports?projectId=xxx
   */
  async listReports(req: ProjectRequest, res: Response) {
    try {
      await verifyProjectAccess(req, 'read')
      const projectId = req.query.projectId as string

      const reports = await prisma.report.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          exportFormat: true,
          generatedBy: true,
        },
      })

      res.json({
        success: true,
        reports,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error('List reports error:', error)
      res.status(500).json({
        error: 'Failed to list reports',
        message,
      })
    }
  }
}

export const reportController = new ReportController()
