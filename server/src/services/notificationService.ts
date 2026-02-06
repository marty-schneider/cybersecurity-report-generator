import { prisma } from '../utils/db.js'
import { NotificationType } from '@prisma/client'
import { logger } from '../utils/logger.js'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  projectId?: string
}

export const notificationService = {
  /** Fire-and-forget: create a notification */
  create(params: CreateNotificationParams): void {
    prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
        projectId: params.projectId,
      },
    }).catch((error) => {
      logger.error('Failed to create notification:', error)
    })
  },

  /** Fire-and-forget: create notifications for multiple users */
  createBulk(userIds: string[], params: Omit<CreateNotificationParams, 'userId'>): void {
    const data = userIds.map(userId => ({
      userId,
      type: params.type,
      title: params.title,
      message: params.message,
      entityType: params.entityType,
      entityId: params.entityId,
      projectId: params.projectId,
    }))

    prisma.notification.createMany({ data }).catch((error) => {
      logger.error('Failed to create bulk notifications:', error)
    })
  },

  /** Notify all members of a project */
  async notifyProjectMembers(
    projectId: string,
    excludeUserId: string,
    params: Omit<CreateNotificationParams, 'userId' | 'projectId'>
  ): Promise<void> {
    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: { select: { userId: true } },
        },
      })
      if (!project) return

      const userIds = [
        project.createdBy,
        ...project.members.map(m => m.userId),
      ].filter(id => id !== excludeUserId)

      const uniqueIds = Array.from(new Set(userIds))
      if (uniqueIds.length === 0) return

      this.createBulk(uniqueIds, { ...params, projectId })
    } catch (error) {
      logger.error('Failed to notify project members:', error)
    }
  },
}
