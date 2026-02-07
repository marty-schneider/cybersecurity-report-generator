import apiClient from './apiClient'
import { FindingTemplate, Severity } from '../types'

export const findingTemplateService = {
  async list(filters?: { search?: string; category?: string; severity?: Severity }): Promise<FindingTemplate[]> {
    const params = new URLSearchParams()
    if (filters?.search) params.set('search', filters.search)
    if (filters?.category) params.set('category', filters.category)
    if (filters?.severity) params.set('severity', filters.severity)

    const query = params.toString()
    const response = await apiClient.get<FindingTemplate[]>(
      `/finding-templates${query ? `?${query}` : ''}`
    )
    return response.data
  },

  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<string[]>('/finding-templates/categories')
    return response.data
  },
}
