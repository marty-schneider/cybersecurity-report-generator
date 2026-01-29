import apiClient from './apiClient'

export interface GenerateReportResponse {
  success: boolean
  reportId: string
  html: string
  generatedAt: string
}

export interface GetReportResponse {
  success: boolean
  reportId: string
  html: string
  project: {
    id: string
    name: string
    clientName: string
  }
  generatedAt: string
}

export interface ListReportsResponse {
  success: boolean
  reports: Array<{
    id: string
    createdAt: string
    exportFormat: string
    generatedBy: string
  }>
}

class ReportService {
  /**
   * Generate a new assessment report for a project
   */
  async generateReport(projectId: string): Promise<GenerateReportResponse> {
    const response = await apiClient.post('/reports/generate', { projectId })
    return response.data
  }

  /**
   * Get an existing report by ID
   */
  async getReport(reportId: string): Promise<GetReportResponse> {
    const response = await apiClient.get(`/reports/${reportId}`)
    return response.data
  }

  /**
   * List all reports for a project
   */
  async listReports(projectId: string): Promise<ListReportsResponse> {
    const response = await apiClient.get(`/reports?projectId=${projectId}`)
    return response.data
  }
}

export default new ReportService()
