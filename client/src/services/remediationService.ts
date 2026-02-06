import apiClient from './apiClient'
import { Finding, RemediationNote, RemediationDashboardData } from '../types'

export const remediationService = {
  async updateStatus(
    findingId: string,
    data: {
      status?: string
      remediationAssignedDate?: string | null
      remediationTargetDate?: string | null
      retestDate?: string | null
      verifiedDate?: string | null
      riskAcceptanceNote?: string
    }
  ): Promise<Finding> {
    const response = await apiClient.patch<Finding>(`/remediation/findings/${findingId}/remediation`, data)
    return response.data
  },

  async addNote(findingId: string, note: string): Promise<RemediationNote> {
    const response = await apiClient.post<RemediationNote>(`/remediation/findings/${findingId}/notes`, { note })
    return response.data
  },

  async getTimeline(findingId: string): Promise<{ finding: Finding; timeline: Array<{ type: string; date: string; detail: string; user?: { id: string; name: string; email: string } }> }> {
    const response = await apiClient.get(`/remediation/findings/${findingId}/timeline`)
    return response.data
  },

  async getDashboard(projectId: string): Promise<RemediationDashboardData> {
    const response = await apiClient.get<RemediationDashboardData>(`/remediation/projects/${projectId}/dashboard`)
    return response.data
  },
}
