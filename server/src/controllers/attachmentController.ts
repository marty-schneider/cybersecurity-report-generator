import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middleware/auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from '../middleware/errorHandler.js'
import { verifyResourceAccess } from '../middleware/projectAccess.js'
import { auditService } from '../services/auditService.js'
import { join } from 'path'
import { existsSync, unlinkSync } from 'fs'
import { UPLOAD_DIR } from '../middleware/upload.js'

export const uploadAttachment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params
    const userId = req.user!.id
    const { caption } = req.body

    if (!req.file) {
      throw new AppError('No file uploaded', 400)
    }

    const finding = await verifyResourceAccess(userId, findingId, prisma.finding, 'write')

    const attachment = await prisma.attachment.create({
      data: {
        findingId,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        storagePath: req.file.filename,
        caption: caption || null,
        uploadedBy: userId,
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
    })

    auditService.log({
      userId,
      projectId: finding.projectId,
      action: 'CREATE',
      entityType: 'Attachment',
      entityId: attachment.id,
      details: { fileName: attachment.fileName, fileSize: attachment.fileSize },
      req,
    })

    res.status(201).json(attachment)
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      const filePath = join(UPLOAD_DIR, req.file.filename)
      if (existsSync(filePath)) unlinkSync(filePath)
    }
    next(error)
  }
}

export const getAttachment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { finding: { select: { projectId: true } } },
    })

    if (!attachment) {
      throw new AppError('Attachment not found', 404)
    }

    // Verify user has access to the parent finding's project
    await verifyResourceAccess(userId, attachment.findingId, prisma.finding, 'read')

    const filePath = join(UPLOAD_DIR, attachment.storagePath)
    if (!existsSync(filePath)) {
      throw new AppError('File not found on disk', 404)
    }

    res.setHeader('Content-Type', attachment.fileType)
    res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`)
    res.sendFile(filePath)
  } catch (error) {
    next(error)
  }
}

export const listAttachments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { findingId } = req.params
    const userId = req.user!.id

    await verifyResourceAccess(userId, findingId, prisma.finding, 'read')

    const attachments = await prisma.attachment.findMany({
      where: { findingId },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(attachments)
  } catch (error) {
    next(error)
  }
}

export const deleteAttachment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: { finding: { select: { projectId: true } } },
    })

    if (!attachment) {
      throw new AppError('Attachment not found', 404)
    }

    await verifyResourceAccess(userId, attachment.findingId, prisma.finding, 'write')

    // Delete from disk
    const filePath = join(UPLOAD_DIR, attachment.storagePath)
    if (existsSync(filePath)) unlinkSync(filePath)

    // Delete from database
    await prisma.attachment.delete({ where: { id } })

    auditService.log({
      userId,
      projectId: attachment.finding.projectId,
      action: 'DELETE',
      entityType: 'Attachment',
      entityId: id,
      details: { fileName: attachment.fileName },
      req,
    })

    res.json({ message: 'Attachment deleted successfully' })
  } catch (error) {
    next(error)
  }
}
