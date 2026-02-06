import { CVEData } from '../../types'
import { SeverityBadge } from '../badges'
import { Severity } from '../../types'

interface CVEInfoCardProps {
  cveData: CVEData
}

function cveSeverityToSeverity(sev?: string): Severity {
  if (!sev) return 'INFO'
  const map: Record<string, Severity> = {
    CRITICAL: 'CRITICAL',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  }
  return map[sev.toUpperCase()] || 'INFO'
}

export default function CVEInfoCard({ cveData }: CVEInfoCardProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-sm font-bold text-blue-800">{cveData.cveId}</span>
        {cveData.cvssScore && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            CVSS {cveData.cvssScore}
          </span>
        )}
        {cveData.cvssSeverity && (
          <SeverityBadge severity={cveSeverityToSeverity(cveData.cvssSeverity)} />
        )}
      </div>
      <p className="text-sm text-gray-700 mb-2 line-clamp-3">{cveData.description}</p>
      {cveData.cvssVector && (
        <p className="text-xs text-gray-500 font-mono mb-2">{cveData.cvssVector}</p>
      )}
      <div className="flex gap-2 text-xs text-gray-500">
        <span>Published: {new Date(cveData.published).toLocaleDateString()}</span>
        {cveData.references.length > 0 && (
          <a
            href={cveData.references[0].url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Reference
          </a>
        )}
      </div>
    </div>
  )
}
