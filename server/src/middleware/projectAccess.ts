import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.js'
import { prisma } from '../utils/db.js'
import { AppError } from './errorHandler.js'
import { Project } from '@prisma/client'

export interface ProjectRequest extends AuthRequest {
  project?: Project
}

/**
 * Prisma where-clause for read access: creator OR any team member.
 */
const readAccessFilter = (userId: string, projectId: string) => ({
  id: projectId,
  OR: [
    { createdBy: userId },
    { members: { some: { userId } } },
  ],
})

/**
 * Prisma where-clause for write access: creator OR OWNER/EDITOR team member.
 */
const writeAccessFilter = (userId: string, projectId: string) => ({
  id: projectId,
  OR: [
    { createdBy: userId },
    { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] as const } } } },
  ],
})

/**
 * Verify the current user has read access to a project.
 * Looks for projectId in req.params.id, req.params.projectId,
 * req.query.projectId, or req.body.projectId.
 *
 * Attaches the found project to req.project.
 */
export async function verifyProjectAccess(
  req: ProjectRequest,
  mode: 'read' | 'write' = 'read',
): Promise<Project> {
  const userId = req.user!.id
  const projectId =
    req.params.projectId ??
    req.query.projectId as string | undefined ??
    req.body.projectId ??
    undefined

  if (!projectId) {
    throw new AppError('Project ID is required', 400)
  }

  const filter = mode === 'write'
    ? writeAccessFilter(userId, projectId)
    : readAccessFilter(userId, projectId)

  const project = await prisma.project.findFirst({ where: filter })

  if (!project) {
    const message = mode === 'write'
      ? 'Project not found or insufficient permissions'
      : 'Project not found or access denied'
    throw new AppError(message, 404)
  }

  req.project = project
  return project
}

/**
 * Verify the current user has read/write access to a resource
 * that belongs to a project (e.g., IOC, Finding, TTPMapping).
 *
 * Uses a Prisma `findFirst` with a nested project access filter.
 */
export async function verifyResourceAccess<T>(
  userId: string,
  resourceId: string,
  model: {
    findFirst: (args: { where: any }) => Promise<T | null>
  },
  mode: 'read' | 'write' = 'write',
): Promise<T> {
  const projectFilter = mode === 'write'
    ? {
        OR: [
          { createdBy: userId },
          { members: { some: { userId, role: { in: ['OWNER', 'EDITOR'] } } } },
        ],
      }
    : {
        OR: [
          { createdBy: userId },
          { members: { some: { userId } } },
        ],
      }

  const resource = await model.findFirst({
    where: {
      id: resourceId,
      project: projectFilter,
    },
  })

  if (!resource) {
    const message = mode === 'write'
      ? 'Resource not found or insufficient permissions'
      : 'Resource not found'
    throw new AppError(message, 404)
  }

  return resource
}
