import apiClient from './apiClient'
import { IOC, IOCType } from '../types'

export const iocService = {
  async getByProject(projectId: string): Promise<IOC[]> {
    const response = await apiClient.get<IOC[]>(`/iocs?projectId=${projectId}`)
    return response.data
  },

  async getById(id: string): Promise<IOC> {
    const response = await apiClient.get<IOC>(`/iocs/${id}`)
    return response.data
  },

  async create(data: {
    projectId: string
    type: IOCType
    value: string
    timestamp: string
    context?: string
    source?: string
  }): Promise<IOC> {
    const response = await apiClient.post<IOC>('/iocs', data)
    return response.data
  },

  async bulkCreate(data: {
    projectId: string
    iocs: Array<{
      type: IOCType
      value: string
      timestamp: string
      context?: string
      source?: string
    }>
  }): Promise<{ message: string; count: number }> {
    const response = await apiClient.post('/iocs/bulk', data)
    return response.data
  },

  async update(
    id: string,
    data: Partial<{
      type: IOCType
      value: string
      timestamp: string
      context: string | null
      source: string | null
      enrichmentData: Record<string, any> | null
    }>
  ): Promise<IOC> {
    const response = await apiClient.put<IOC>(`/iocs/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/iocs/${id}`)
  },
}
