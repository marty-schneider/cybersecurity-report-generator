import apiClient from './apiClient'
import {
  OverviewStats,
  SeverityDistribution,
  StatusDistribution,
  FindingsOverTimeEntry,
  IOCTypeBreakdownEntry,
  MitreHeatmap,
  RiskPostureEntry,
} from '../types'

export const analyticsService = {
  async getOverview(): Promise<OverviewStats> {
    const res = await apiClient.get('/analytics/overview')
    return res.data
  },

  async getSeverityDistribution(): Promise<SeverityDistribution[]> {
    const res = await apiClient.get('/analytics/severity-distribution')
    return res.data
  },

  async getStatusDistribution(): Promise<StatusDistribution[]> {
    const res = await apiClient.get('/analytics/status-distribution')
    return res.data
  },

  async getFindingsOverTime(range?: string): Promise<FindingsOverTimeEntry[]> {
    const params = range ? `?range=${range}` : ''
    const res = await apiClient.get(`/analytics/findings-over-time${params}`)
    return res.data
  },

  async getIOCTypeBreakdown(): Promise<IOCTypeBreakdownEntry[]> {
    const res = await apiClient.get('/analytics/ioc-type-breakdown')
    return res.data
  },

  async getMitreHeatmap(): Promise<MitreHeatmap> {
    const res = await apiClient.get('/analytics/mitre-heatmap')
    return res.data
  },

  async getRiskPosture(): Promise<RiskPostureEntry[]> {
    const res = await apiClient.get('/analytics/risk-posture')
    return res.data
  },
}
