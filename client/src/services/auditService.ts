import apiClient from './apiClient'
import { PaginatedAuditResponse, AuditAction } from '../types'

export interface AuditLogFilters {
  page?: number
  limit?: number
  action?: AuditAction
  entityType?: string
  startDate?: string
  endDate?: string
}

export const auditService = {
  async getProjectLog(projectId: string, filters?: AuditLogFilters): Promise<PaginatedAuditResponse> {
    const params = new URLSearchParams()
    if (filters?.page) params.set('page', String(filters.page))
    if (filters?.limit) params.set('limit', String(filters.limit))
    if (filters?.action) params.set('action', String(filters.action))
    if (filters?.entityType) params.set('entityType', filters.entityType)
    if (filters?.startDate) params.set('startDate', filters.startDate)
    if (filters?.endDate) params.set('endDate', filters.endDate)

    const query = params.toString()
    const response = await apiClient.get<PaginatedAuditResponse>(
      `/audit/project/${projectId}${query ? `?${query}` : ''}`
    )
    return response.data
  },
}
