import { useState, useEffect } from 'react'
import { complianceService } from '../../services/complianceService'
import { ComplianceSummary } from '../../types'
import { notify } from '../../store/notificationStore'
import { SeverityBadge } from '../badges'

interface Props {
  projectId: string
}

export default function ComplianceDashboard({ projectId }: Props) {
  const [summaries, setSummaries] = useState<ComplianceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFramework, setActiveFramework] = useState<string | null>(null)

  useEffect(() => {
    loadSummary()
  }, [projectId])

  const loadSummary = async () => {
    try {
      setLoading(true)
      const data = await complianceService.getProjectSummary(projectId)
      setSummaries(data)
      if (data.length > 0) setActiveFramework(data[0].framework.shortCode)
    } catch {
      notify.error('Failed to load compliance summary')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-400 py-4">Loading compliance data...</div>
  }

  if (summaries.length === 0) {
    return <div className="text-sm text-gray-500 py-4">No compliance frameworks available. Seed the database first.</div>
  }

  const activeSummary = summaries.find(s => s.framework.shortCode === activeFramework)

  return (
    <div className="space-y-4">
      {/* Framework Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {summaries.map(s => (
          <button
            key={s.framework.shortCode}
            onClick={() => setActiveFramework(s.framework.shortCode)}
            className={`px-3 py-1.5 text-sm rounded-t font-medium ${
              activeFramework === s.framework.shortCode
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.framework.name}
          </button>
        ))}
      </div>

      {activeSummary && (
        <>
          {/* Coverage bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">
                  Coverage: {activeSummary.mappedControls}/{activeSummary.totalControls} controls
                </span>
                <span className="text-gray-500">
                  {Math.round(activeSummary.coverage * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    activeSummary.coverage > 0.7 ? 'bg-green-500'
                      : activeSummary.coverage > 0.4 ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.round(activeSummary.coverage * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mappings table */}
          {activeSummary.mappings.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">
              No findings mapped to {activeSummary.framework.name} controls yet.
              Expand a finding above and use the compliance mapping panel to add mappings.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-4 font-medium text-gray-600">Control</th>
                    <th className="py-2 pr-4 font-medium text-gray-600">Title</th>
                    <th className="py-2 pr-4 font-medium text-gray-600">Finding</th>
                    <th className="py-2 pr-4 font-medium text-gray-600">Severity</th>
                    <th className="py-2 font-medium text-gray-600">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSummary.mappings.map(m => (
                    <tr key={m.id} className="border-b border-gray-100">
                      <td className="py-2 pr-4 font-mono text-xs">{m.controlId}</td>
                      <td className="py-2 pr-4 text-gray-700">{m.controlTitle}</td>
                      <td className="py-2 pr-4 text-gray-900">{m.finding.title}</td>
                      <td className="py-2 pr-4">
                        <SeverityBadge severity={m.finding.severity} />
                      </td>
                      <td className="py-2 text-gray-500 text-xs">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
