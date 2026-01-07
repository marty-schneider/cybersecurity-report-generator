import apiClient from './apiClient'
import { Project, AssessmentType, ProjectStatus } from '../types'

export const projectService = {
  async getAll(): Promise<Project[]> {
    const response = await apiClient.get<Project[]>('/projects')
    return response.data
  },

  async getById(id: string): Promise<Project> {
    const response = await apiClient.get<Project>(`/projects/${id}`)
    return response.data
  },

  async create(data: {
    name: string
    clientName: string
    assessmentType: AssessmentType
    startDate: string
    endDate?: string
  }): Promise<Project> {
    const response = await apiClient.post<Project>('/projects', data)
    return response.data
  },

  async update(
    id: string,
    data: Partial<{
      name: string
      clientName: string
      assessmentType: AssessmentType
      startDate: string
      endDate: string | null
      status: ProjectStatus
    }>
  ): Promise<Project> {
    const response = await apiClient.put<Project>(`/projects/${id}`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/projects/${id}`)
  },
}
