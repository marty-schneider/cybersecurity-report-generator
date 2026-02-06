import { prisma } from '../utils/db.js'
import { AuditAction, Prisma } from '@prisma/client'
import { logger } from '../utils/logger.js'

interface AuditLogParams {
  userId: string
  projectId?: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown>
  req?: { ip?: string; headers?: Record<string, string | string[] | undefined> }
}

export const auditService = {
  log(params: AuditLogParams): void {
    // Fire-and-forget — never awaited, never blocks the main request
    prisma.auditLog
      .create({
        data: {
          userId: params.userId,
          projectId: params.projectId ?? undefined,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId ?? undefined,
          details: (params.details as Prisma.InputJsonValue) ?? undefined,
          ipAddress: params.req?.ip ?? undefined,
          userAgent: (params.req?.headers?.['user-agent'] as string) ?? undefined,
        },
      })
      .catch((error) => {
        logger.error('Audit log write failed:', error)
      })
  },
}
