import apiClient from './apiClient'
import { CVEData } from '../types'

export const cveService = {
  async lookup(cveId: string): Promise<CVEData> {
    const response = await apiClient.get<CVEData>(`/cve/lookup?cveId=${encodeURIComponent(cveId)}`)
    return response.data
  },

  async enrichFinding(findingId: string): Promise<{ cveData: CVEData; finding: unknown }> {
    const response = await apiClient.post(`/cve/enrich/finding/${findingId}`)
    return response.data
  },

  async enrichProject(projectId: string): Promise<{ enriched: number; total: number }> {
    const response = await apiClient.post(`/cve/enrich/project/${projectId}`)
    return response.data
  },
}
