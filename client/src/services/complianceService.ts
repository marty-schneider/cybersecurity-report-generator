import apiClient from './apiClient'
import {
  ComplianceFramework,
  ComplianceControl,
  FindingComplianceMapping,
  ComplianceSummary,
} from '../types'

export const complianceService = {
  async listFrameworks(): Promise<ComplianceFramework[]> {
    const res = await apiClient.get('/compliance/frameworks')
    return res.data
  },

  async getControls(frameworkId: string, search?: string, category?: string): Promise<ComplianceControl[]> {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (category) params.append('category', category)
    const query = params.toString() ? `?${params}` : ''
    const res = await apiClient.get(`/compliance/frameworks/${frameworkId}/controls${query}`)
    return res.data
  },

  async mapFinding(findingId: string, complianceControlId: string, notes?: string): Promise<FindingComplianceMapping> {
    const res = await apiClient.post('/compliance/map', { findingId, complianceControlId, notes })
    return res.data
  },

  async unmapFinding(mappingId: string): Promise<void> {
    await apiClient.delete(`/compliance/map/${mappingId}`)
  },

  async getFindingMappings(findingId: string): Promise<FindingComplianceMapping[]> {
    const res = await apiClient.get(`/compliance/finding/${findingId}`)
    return res.data
  },

  async getProjectSummary(projectId: string): Promise<ComplianceSummary[]> {
    const res = await apiClient.get(`/compliance/project/${projectId}/summary`)
    return res.data
  },
}
