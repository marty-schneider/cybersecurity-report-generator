import { Request, Response } from 'express'
import { reportGenerationService } from '../services/reportGenerationService.js'
import { logger } from '../utils/logger.js'
import { prisma } from '../utils/db.js'

export class ReportController {
  /**
   * Generate assessment report for a project
   * POST /api/reports/generate
   */
  async generateReport(req: Request, res: Response) {
    try {
      const { projectId } = req.body
      const userId = (req as any).user.userId

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' })
      }

      // Verify user has access to project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { createdBy: userId },
            {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
      })

      if (!project) {
        return res.status(404).json({ error: 'Project not found or access denied' })
      }

      logger.info(`Generating report for project ${projectId} by user ${userId}`)

      // Generate the report HTML
      const reportHtml = await reportGenerationService.generateReport(projectId)

      // Save report metadata to database
      const report = await prisma.report.create({
        data: {
          projectId: projectId,
          templateId: 'default',
          generatedBy: userId,
          exportFormat: 'PDF',
          fileUrl: '', // We're returning HTML directly, not storing files
        },
      })

      res.json({
        success: true,
        reportId: report.id,
        html: reportHtml,
        generatedAt: report.createdAt,
      })
    } catch (error: any) {
      logger.error('Report generation error:', error)
      res.status(500).json({
        error: 'Failed to generate report',
        message: error.message,
      })
    }
  }

  /**
   * Get existing report
   * GET /api/reports/:id
   */
  async getReport(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = (req as any).user.userId

      const report = await prisma.report.findFirst({
        where: {
          id: id,
          project: {
            OR: [
              { createdBy: userId },
              {
                members: {
                  some: {
                    userId: userId,
                  },
                },
              },
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

      // Regenerate the report HTML
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
    } catch (error: any) {
      logger.error('Get report error:', error)
      res.status(500).json({
        error: 'Failed to retrieve report',
        message: error.message,
      })
    }
  }

  /**
   * List reports for a project
   * GET /api/reports?projectId=xxx
   */
  async listReports(req: Request, res: Response) {
    try {
      const { projectId } = req.query
      const userId = (req as any).user.userId

      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: 'Project ID is required' })
      }

      // Verify access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { createdBy: userId },
            {
              members: {
                some: {
                  userId: userId,
                },
              },
            },
          ],
        },
      })

      if (!project) {
        return res.status(404).json({ error: 'Project not found or access denied' })
      }

      const reports = await prisma.report.findMany({
        where: {
          projectId: projectId,
        },
        orderBy: {
          createdAt: 'desc',
        },
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
    } catch (error: any) {
      logger.error('List reports error:', error)
      res.status(500).json({
        error: 'Failed to list reports',
        message: error.message,
      })
    }
  }
}

export const reportController = new ReportController()
