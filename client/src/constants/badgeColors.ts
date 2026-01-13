import { Severity } from '../types'

// Severity badge color classes
export const getSeverityBadgeClass = (severity: Severity): string => {
  const colors = {
    CRITICAL: 'bg-severity-critical text-white',
    HIGH: 'bg-severity-high text-white',
    MEDIUM: 'bg-severity-medium text-white',
    LOW: 'bg-severity-low text-white',
    INFO: 'bg-severity-info text-white',
  }
  return colors[severity]
}

// Status badge color classes
export const getStatusBadgeClass = (status: string): string => {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700',
    IN_REVIEW: 'bg-yellow-100 text-yellow-700',
    VERIFIED: 'bg-purple-100 text-purple-700',
    MITIGATED: 'bg-green-100 text-green-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

// Project status color classes
export const getProjectStatusClass = (status: string): string => {
  const colors: Record<string, string> = {
    ACTIVE: 'text-green-600',
    COMPLETED: 'text-blue-600',
    ARCHIVED: 'text-gray-600',
  }
  return colors[status] || 'text-gray-600'
}

// IOC type badge color classes
export const getIOCTypeBadgeClass = (type: string): string => {
  const colors: Record<string, string> = {
    IP_ADDRESS: 'bg-blue-100 text-blue-700',
    DOMAIN: 'bg-purple-100 text-purple-700',
    URL: 'bg-indigo-100 text-indigo-700',
    FILE_HASH_MD5: 'bg-green-100 text-green-700',
    FILE_HASH_SHA1: 'bg-green-100 text-green-700',
    FILE_HASH_SHA256: 'bg-green-100 text-green-700',
    EMAIL: 'bg-yellow-100 text-yellow-700',
    CVE: 'bg-red-100 text-red-700',
    REGISTRY_KEY: 'bg-gray-100 text-gray-700',
    COMMAND_LINE: 'bg-pink-100 text-pink-700',
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

// Severity color for confidence levels
export const getSeverityColor = (confidence: number): string => {
  if (confidence >= 0.8) return 'text-severity-critical'
  if (confidence >= 0.6) return 'text-severity-high'
  if (confidence >= 0.4) return 'text-severity-medium'
  return 'text-severity-low'
}
