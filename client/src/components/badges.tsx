import { Severity, IOCType, AssessmentType } from '../types'
import {
  getSeverityBadgeClass,
  getStatusBadgeClass,
  getIOCTypeBadgeClass,
  getSeverityColor,
} from '../constants/badgeColors'

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`px-3 py-1 rounded text-sm font-medium ${getSeverityBadgeClass(severity)}`}>
      {severity}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(status)}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function IOCTypeBadge({ type }: { type: IOCType | string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getIOCTypeBadgeClass(type)}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className={`text-sm font-medium ${getSeverityColor(confidence)}`}>
      {Math.round(confidence * 100)}% confidence
    </span>
  )
}

const ASSESSMENT_TYPE_COLORS: Record<string, string> = {
  PENTEST: 'bg-purple-100 text-purple-700',
  VULN_ASSESSMENT: 'bg-blue-100 text-blue-700',
  SECURITY_AUDIT: 'bg-green-100 text-green-700',
  RED_TEAM: 'bg-red-100 text-red-700',
  INCIDENT_RESPONSE: 'bg-orange-100 text-orange-700',
}

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  PENTEST: 'Penetration Test',
  VULN_ASSESSMENT: 'Vulnerability Assessment',
  SECURITY_AUDIT: 'Security Audit',
  RED_TEAM: 'Red Team',
  INCIDENT_RESPONSE: 'Incident Response',
}

export function AssessmentTypeBadge({ type }: { type: AssessmentType }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${ASSESSMENT_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'}`}>
      {ASSESSMENT_TYPE_LABELS[type] || type}
    </span>
  )
}
