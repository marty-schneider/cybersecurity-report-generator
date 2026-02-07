import { useEffect, useState } from 'react'
import { remediationService } from '../../services/remediationService'
import { RemediationDashboardData } from '../../types'
import { SeverityBadge, StatusBadge } from '../badges'
import { notify } from '../../store/notificationStore'

interface RemediationDashboardProps {
  projectId: string
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  IN_REVIEW: 'In Review',
  VERIFIED: 'Verified',
  REMEDIATION_PLANNED: 'Planned',
  RETEST_PENDING: 'Retest Pending',
  REMEDIATED: 'Remediated',
  ACCEPTED_RISK: 'Accepted Risk',
  MITIGATED: 'Mitigated',
}

export default function RemediationDashboard({ projectId }: RemediationDashboardProps) {
  const [data, setData] = useState<RemediationDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const dashboard = await remediationService.getDashboard(projectId)
        setData(dashboard)
      } catch {
        notify.error('Failed to load remediation dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [projectId])

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data || data.totalFindings === 0) {
    return <p className="text-gray-500 text-sm">No findings to track.</p>
  }

  const resolvedCount = (data.statusCounts['REMEDIATED'] || 0) + (data.statusCounts['MITIGATED'] || 0) + (data.statusCounts['ACCEPTED_RISK'] || 0)
  const progressPercent = Math.round((resolvedCount / data.totalFindings) * 100)

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Remediation Progress</span>
          <span className="text-sm text-gray-500">{resolvedCount} / {data.totalFindings} resolved ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(data.statusCounts).map(([status, count]) => (
          <div key={status} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <StatusBadge status={status} />
          </div>
        ))}
      </div>

      {/* Overdue Alerts */}
      {data.overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-700 mb-2">
            Overdue ({data.overdue.length})
          </h4>
          <div className="space-y-2">
            {data.overdue.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-gray-900">{f.title}</span>
                </div>
                <span className="text-red-600 text-xs">
                  Due: {f.remediationTargetDate ? new Date(f.remediationTargetDate).toLocaleDateString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Retests */}
      {data.upcomingRetests.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-orange-700 mb-2">
            Upcoming Retests ({data.upcomingRetests.length})
          </h4>
          <div className="space-y-2">
            {data.upcomingRetests.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-gray-900">{f.title}</span>
                </div>
                <span className="text-orange-600 text-xs">
                  Retest: {f.retestDate ? new Date(f.retestDate).toLocaleDateString() : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Findings Status Table */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">All Findings</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 text-gray-600 font-medium">Finding</th>
                <th className="text-left py-2 px-2 text-gray-600 font-medium">Severity</th>
                <th className="text-left py-2 px-2 text-gray-600 font-medium">Status</th>
                <th className="text-left py-2 px-2 text-gray-600 font-medium">Target Date</th>
              </tr>
            </thead>
            <tbody>
              {data.findings.map((f) => (
                <tr key={f.id} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-900">{f.title}</td>
                  <td className="py-2 px-2"><SeverityBadge severity={f.severity} /></td>
                  <td className="py-2 px-2"><StatusBadge status={f.status} /></td>
                  <td className="py-2 px-2 text-gray-500 text-xs">
                    {f.remediationTargetDate ? new Date(f.remediationTargetDate).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
