import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { verifyProjectAccess } from '../middleware/projectAccess.js'
import { csvExportService } from '../services/csvExportService.js'
import { jsonExportService } from '../services/jsonExportService.js'
import { docxExportService } from '../services/docxExportService.js'
import { reportGenerationService } from '../services/reportGenerationService.js'
import { prisma } from '../utils/db.js'

export const exportCSV = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    await verifyProjectAccess(req, 'read')

    const entity = (req.query.entity as string) || 'findings'
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    const safeName = (project?.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')

    let csv: string
    if (entity === 'iocs') {
      csv = await csvExportService.exportIOCs(projectId)
    } else {
      csv = await csvExportService.exportFindings(projectId)
    }

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_${entity}.csv"`)
    res.send(csv)
  } catch (error) {
    next(error)
  }
}

export const exportJSON = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    await verifyProjectAccess(req, 'read')

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    const safeName = (project?.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')

    const json = await jsonExportService.exportProject(projectId)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_export.json"`)
    res.send(json)
  } catch (error) {
    next(error)
  }
}

export const exportHTML = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    await verifyProjectAccess(req, 'read')

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    const safeName = (project?.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')

    const html = await reportGenerationService.generateReport(projectId)

    res.setHeader('Content-Type', 'text/html')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.html"`)
    res.send(html)
  } catch (error) {
    next(error)
  }
}

export const exportDOCX = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId } = req.params
    await verifyProjectAccess(req, 'read')

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } })
    const safeName = (project?.name || 'export').replace(/[^a-zA-Z0-9]/g, '_')

    const buffer = await docxExportService.exportReport(projectId)

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_report.docx"`)
    res.send(buffer)
  } catch (error) {
    next(error)
  }
}
