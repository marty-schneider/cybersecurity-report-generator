// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'USER' | 'ADMIN'
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  user: User
  token: string
}

// Project types
export type AssessmentType = 'PENTEST' | 'VULN_ASSESSMENT' | 'SECURITY_AUDIT' | 'RED_TEAM' | 'INCIDENT_RESPONSE'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface Project {
  id: string
  name: string
  clientName: string
  assessmentType: AssessmentType
  startDate: string
  endDate?: string
  status: ProjectStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Finding types
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
export type FindingStatus = 'NEW' | 'IN_REVIEW' | 'VERIFIED' | 'MITIGATED'

export interface Finding {
  id: string
  projectId: string
  title: string
  description: string
  severity: Severity
  cvssScore?: number
  affectedSystems: string[]
  evidence?: string
  remediation: string
  status: FindingStatus
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

// IOC types
export type IOCType =
  | 'IP_ADDRESS'
  | 'DOMAIN'
  | 'URL'
  | 'FILE_HASH_MD5'
  | 'FILE_HASH_SHA1'
  | 'FILE_HASH_SHA256'
  | 'EMAIL'
  | 'CVE'
  | 'REGISTRY_KEY'
  | 'MUTEX'
  | 'USER_AGENT'
  | 'CERTIFICATE'
  | 'FILE_PATH'
  | 'COMMAND_LINE'

export interface IOC {
  id: string
  projectId: string
  type: IOCType
  value: string
  timestamp: string
  context?: string
  source?: string
  enrichmentData?: Record<string, any>
  createdAt: string
  updatedAt: string
}

// TTP types
export interface TTPMapping {
  id: string
  projectId: string
  iocIds: string[]
  mitreId: string
  tacticName: string
  techniqueName: string
  description?: string
  confidence: number
  aiAnalysis?: string
  createdAt: string
  updatedAt: string
}

// Report types
export type ExportFormat = 'PDF' | 'DOCX'

export interface Report {
  id: string
  projectId: string
  templateId: string
  generatedBy: string
  exportFormat: ExportFormat
  fileUrl: string
  createdAt: string
}

// Template types
export interface Template {
  id: string
  name: string
  type: AssessmentType
  content: Record<string, any>
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
