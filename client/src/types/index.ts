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
  iocs?: IOC[]
  ttpMappings?: TTPMapping[]
}

// Finding types
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
export type FindingStatus = 'NEW' | 'IN_REVIEW' | 'VERIFIED' | 'REMEDIATION_PLANNED' | 'RETEST_PENDING' | 'REMEDIATED' | 'ACCEPTED_RISK' | 'MITIGATED'

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
  remediationAssignedDate?: string
  remediationTargetDate?: string
  retestDate?: string
  verifiedDate?: string
  riskAcceptanceNote?: string
  cveId?: string
  cveData?: CVEData
  cveEnrichedAt?: string
  remediationNotes?: RemediationNote[]
  createdAt: string
  updatedAt: string
}

export interface CVEData {
  cveId: string
  description: string
  cvssScore?: number
  cvssSeverity?: string
  cvssVector?: string
  references: Array<{ url: string; source: string }>
  published: string
  lastModified: string
}

export interface RemediationNote {
  id: string
  findingId: string
  note: string
  createdBy: string
  author: { id: string; name: string; email: string }
  createdAt: string
}

export interface RemediationDashboardData {
  statusCounts: Record<string, number>
  totalFindings: number
  overdue: Array<{ id: string; title: string; severity: Severity; status: FindingStatus; remediationTargetDate?: string }>
  upcomingRetests: Array<{ id: string; title: string; severity: Severity; status: FindingStatus; retestDate?: string }>
  findings: Array<{ id: string; title: string; severity: Severity; status: FindingStatus; remediationTargetDate?: string; retestDate?: string }>
}

// Attachment types
export interface Attachment {
  id: string
  findingId: string
  fileName: string
  fileType: string
  fileSize: number
  storagePath: string
  caption?: string
  uploadedBy: string
  uploader?: { id: string; name: string; email: string }
  createdAt: string
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
export type ExportFormat = 'PDF' | 'DOCX' | 'CSV' | 'JSON' | 'HTML'

export interface Report {
  id: string
  projectId: string
  templateId: string
  generatedBy: string
  exportFormat: ExportFormat
  fileUrl: string
  createdAt: string
}

// Audit Log types
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'SHARE' | 'LOGIN'

export interface AuditLog {
  id: string
  userId: string
  user?: { id: string; name: string; email: string }
  projectId?: string
  action: AuditAction
  entityType: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

export interface PaginatedAuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
}

// Finding Template types
export interface FindingTemplate {
  id: string
  title: string
  description: string
  severity: Severity
  cvssScore?: number
  category: string
  remediation: string
  references: string[]
  tags: string[]
  isBuiltIn: boolean
  createdBy?: string
  createdAt: string
  updatedAt: string
}

// Analytics types
export interface OverviewStats {
  totalProjects: number
  activeProjects: number
  totalFindings: number
  totalIOCs: number
  totalTTPs: number
  totalReports: number
  criticalFindings: number
}

export interface SeverityDistribution {
  severity: Severity
  count: number
}

export interface StatusDistribution {
  status: FindingStatus
  count: number
}

export interface FindingsOverTimeEntry {
  date: string
  CRITICAL?: number
  HIGH?: number
  MEDIUM?: number
  LOW?: number
  INFO?: number
}

export interface IOCTypeBreakdownEntry {
  type: IOCType
  count: number
}

export type MitreHeatmap = Record<string, Array<{ technique: string; mitreId: string; count: number }>>

export interface RiskPostureEntry {
  projectId: string
  projectName: string
  totalFindings: number
  CRITICAL?: number
  HIGH?: number
  MEDIUM?: number
  LOW?: number
  INFO?: number
}

// Compliance types
export interface ComplianceFramework {
  id: string
  name: string
  version: string
  shortCode: string
  _count?: { controls: number }
  createdAt: string
}

export interface ComplianceControl {
  id: string
  frameworkId: string
  controlId: string
  title: string
  description: string
  category?: string
}

export interface FindingComplianceMapping {
  id: string
  findingId: string
  complianceControlId: string
  complianceControl: ComplianceControl & { framework: ComplianceFramework }
  isAISuggested: boolean
  confidence?: number
  notes?: string
}

export interface ComplianceSummary {
  framework: {
    id: string
    name: string
    version: string
    shortCode: string
  }
  totalControls: number
  mappedControls: number
  coverage: number
  mappings: Array<{
    id: string
    controlId: string
    controlTitle: string
    finding: { id: string; title: string; severity: Severity }
    isAISuggested: boolean
    confidence?: number
    notes?: string
  }>
}

// Notification types
export type NotificationType =
  | 'FINDING_ASSIGNED'
  | 'FINDING_STATUS_CHANGED'
  | 'REPORT_COMPLETED'
  | 'PROJECT_STATUS_CHANGED'
  | 'PROJECT_MEMBER_ADDED'
  | 'REMEDIATION_DUE'
  | 'SYSTEM'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  projectId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface PaginatedNotificationResponse {
  notifications: AppNotification[]
  total: number
  page: number
  totalPages: number
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
