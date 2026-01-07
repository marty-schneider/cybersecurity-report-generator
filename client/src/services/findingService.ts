import apiClient from './apiClient'
import { Finding, Severity, FindingStatus } from '../types'

export const findingService = {
  async getByProject(projectId: string): Promise<Finding[]> {
    const response = await apiClient.get<Finding[]>(`/findings?projectId=${projectId}`)
    return response.data
  },

  async getById(id: string): Promise<Finding> {
    const response = await apiClient.get<Finding>(`/findings/${id}`)
    return response.data
  },

  async create(data: {
    projectId: string
    title: string
    description: string
    severity: Severity
    cvssScore?: number
    affectedSystems?: string[]
    evidence?: string
    remediation: string
    assignedTo?: string
  }): Promise<Finding> {
    const response = await apiClient.post<Finding>('/findings', data)
    return response.data
  },

  async update(
    id: string,
    data: Partial<{
      title: string
      description: string
      severity: Severity
      cvssScore: number | null
      affectedSystems: string[]
      evidence: string | null
      remediation: string
      status: FindingStatus
      assignedTo: string | null
    }>
  ): Promise<Finding> {
    const response = await apiClient.put<Finding>(`/findings/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/findings/${id}`)
  },
}
