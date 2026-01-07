import apiClient from './apiClient'
import { TTPMapping } from '../types'

interface AnalysisResult {
  success: boolean
  analysis: {
    narrative: string
    timeline: string
    threatActorProfile?: string
    recommendations: string[]
  }
  ttpMappings: TTPMapping[]
  stats: {
    iocsAnalyzed: number
    ttpsIdentified: number
    tactics: string[]
  }
}

interface MitreTechnique {
  id: string
  name: string
  description: string
  tactics: string[]
  url: string
  detection?: string
  mitigation?: string
}

export const ttpService = {
  async getByProject(projectId: string): Promise<TTPMapping[]> {
    const response = await apiClient.get<TTPMapping[]>(`/ttps?projectId=${projectId}`)
    return response.data
  },

  async analyze(projectId: string): Promise<AnalysisResult> {
    const response = await apiClient.post<AnalysisResult>('/ttps/analyze', { projectId })
    return response.data
  },

  async getTechniqueDetails(techniqueId: string): Promise<MitreTechnique> {
    const response = await apiClient.get<MitreTechnique>(`/ttps/technique/${techniqueId}`)
    return response.data
  },

  async getMatrix(): Promise<Record<string, MitreTechnique[]>> {
    const response = await apiClient.get<Record<string, MitreTechnique[]>>('/ttps/matrix')
    return response.data
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/ttps/${id}`)
  },
}
