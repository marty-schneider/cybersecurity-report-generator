// Security Control Framework Definitions
// Based on NIST CSF, CIS Controls, and ISO 27001

export interface ControlDomain {
  id: string
  name: string
  description: string
  subControls: SubControl[]
}

export interface SubControl {
  id: string
  name: string
  description: string
  bestPractices: string[]
  relatedFindingTypes: string[]
}

export const CONTROL_FRAMEWORK: ControlDomain[] = [
  {
    id: 'security-operations',
    name: 'Security Operations',
    description:
      'Security monitoring, incident response, and operational security controls',
    subControls: [
      {
        id: 'endpoint-protection',
        name: 'Endpoint Protection',
        description: 'EDR, antivirus, and endpoint security controls',
        bestPractices: [
          'Deploy EDR across all workstations with centralized management',
          'Enable real-time threat detection and response',
          'Maintain current patching for all endpoint systems',
          'Configure automatic security updates where possible',
        ],
        relatedFindingTypes: ['malware', 'endpoint', 'patch'],
      },
      {
        id: 'logging-monitoring',
        name: 'Centralized Logging',
        description: 'Log collection, retention, and security monitoring',
        bestPractices: [
          'Deploy centralized log collection for all critical systems',
          'Configure log forwarding to SIEM or log aggregation platform',
          'Establish alerting rules for critical security events',
          'Retain logs for minimum of 90 days (12 months recommended)',
        ],
        relatedFindingTypes: ['logging', 'monitoring', 'detection'],
      },
      {
        id: 'perimeter-security',
        name: 'Perimeter Security',
        description: 'Firewall, VPN, and network perimeter controls',
        bestPractices: [
          'Implement next-generation firewall with IPS/IDS',
          'Review firewall rules quarterly and remove unnecessary access',
          'Implement multi-factor authentication for all remote access',
          'Replace legacy VPN technologies with zero-trust alternatives',
        ],
        relatedFindingTypes: ['network', 'vpn', 'firewall', 'remote-access'],
      },
      {
        id: 'vulnerability-management',
        name: 'Vulnerability Management',
        description: 'Vulnerability scanning and patch management',
        bestPractices: [
          'Conduct regular vulnerability scans of all systems',
          'Establish formal patch management process with defined SLAs',
          'Prioritize patching based on risk severity and exploitability',
          'Track vulnerabilities in centralized asset inventory',
        ],
        relatedFindingTypes: ['vulnerability', 'patch', 'cve'],
      },
      {
        id: 'incident-response',
        name: 'Incident Response',
        description: 'Incident detection, response, and recovery capabilities',
        bestPractices: [
          'Maintain documented incident response plan',
          'Conduct regular IR tabletop exercises',
          'Establish clear escalation procedures',
          'Maintain relationships with external IR support resources',
        ],
        relatedFindingTypes: ['incident', 'response', 'breach'],
      },
    ],
  },
  {
    id: 'identity-access',
    name: 'Identity & Access Management',
    description: 'Authentication, authorization, and identity governance',
    subControls: [
      {
        id: 'access-control',
        name: 'Access Control',
        description: 'User access management and authorization',
        bestPractices: [
          'Implement role-based access control (RBAC)',
          'Enforce principle of least privilege',
          'Conduct quarterly access reviews',
          'Remove access immediately upon termination',
        ],
        relatedFindingTypes: ['access', 'authorization', 'privilege'],
      },
      {
        id: 'authentication',
        name: 'Authentication',
        description: 'User authentication and MFA enforcement',
        bestPractices: [
          'Enforce multi-factor authentication for all users',
          'Implement password complexity requirements',
          'Deploy single sign-on (SSO) for enterprise applications',
          'Use passwordless authentication where possible',
        ],
        relatedFindingTypes: ['authentication', 'password', 'mfa', 'credential'],
      },
      {
        id: 'privileged-access',
        name: 'Privileged Access Management',
        description: 'Administrative and privileged account controls',
        bestPractices: [
          'Implement privileged access management (PAM) solution',
          'Require MFA for all administrative access',
          'Monitor and log all privileged account activity',
          'Rotate privileged credentials regularly',
        ],
        relatedFindingTypes: ['admin', 'privileged', 'sudo', 'root'],
      },
    ],
  },
  {
    id: 'data-protection',
    name: 'Data Protection',
    description: 'Data security, encryption, and privacy controls',
    subControls: [
      {
        id: 'encryption',
        name: 'Encryption',
        description: 'Data encryption at rest and in transit',
        bestPractices: [
          'Encrypt all sensitive data at rest using AES-256 or equivalent',
          'Enforce TLS 1.2+ for all data in transit',
          'Implement full disk encryption on all endpoints',
          'Use encrypted protocols for all remote access',
        ],
        relatedFindingTypes: ['encryption', 'tls', 'ssl', 'crypto'],
      },
      {
        id: 'data-classification',
        name: 'Data Classification',
        description: 'Data classification and handling procedures',
        bestPractices: [
          'Establish formal data classification policy',
          'Label and tag sensitive data appropriately',
          'Implement DLP controls for sensitive data',
          'Train users on proper data handling procedures',
        ],
        relatedFindingTypes: ['data', 'classification', 'dlp', 'sensitive'],
      },
      {
        id: 'backup-recovery',
        name: 'Backup & Recovery',
        description: 'Data backup and disaster recovery',
        bestPractices: [
          'Implement 3-2-1 backup strategy',
          'Test backup restoration quarterly',
          'Maintain offsite/offline backups for ransomware protection',
          'Document recovery time objectives (RTO) and recovery point objectives (RPO)',
        ],
        relatedFindingTypes: ['backup', 'recovery', 'disaster', 'ransomware'],
      },
    ],
  },
  {
    id: 'application-security',
    name: 'Application Security',
    description: 'Secure development and application security controls',
    subControls: [
      {
        id: 'secure-development',
        name: 'Secure Development',
        description: 'Secure coding and SDLC practices',
        bestPractices: [
          'Integrate security into SDLC process',
          'Conduct code reviews focusing on security',
          'Implement automated security scanning in CI/CD',
          'Train developers on secure coding practices',
        ],
        relatedFindingTypes: ['code', 'development', 'sdlc', 'appsec'],
      },
      {
        id: 'web-application',
        name: 'Web Application Security',
        description: 'Web application security controls',
        bestPractices: [
          'Deploy web application firewall (WAF)',
          'Implement OWASP Top 10 protections',
          'Conduct regular penetration testing',
          'Perform dynamic and static application security testing',
        ],
        relatedFindingTypes: ['web', 'xss', 'sqli', 'injection', 'owasp'],
      },
      {
        id: 'api-security',
        name: 'API Security',
        description: 'API authentication and security',
        bestPractices: [
          'Implement OAuth 2.0 or API key authentication',
          'Enforce rate limiting on all API endpoints',
          'Validate and sanitize all API inputs',
          'Use API gateway for centralized security controls',
        ],
        relatedFindingTypes: ['api', 'rest', 'graphql', 'authentication'],
      },
    ],
  },
  {
    id: 'cloud-security',
    name: 'Cloud Security',
    description: 'Cloud infrastructure and service security',
    subControls: [
      {
        id: 'cloud-configuration',
        name: 'Cloud Configuration',
        description: 'Cloud infrastructure configuration security',
        bestPractices: [
          'Implement infrastructure-as-code with security scanning',
          'Enable cloud security posture management (CSPM)',
          'Follow CIS benchmarks for cloud configuration',
          'Regularly review and remediate misconfigurations',
        ],
        relatedFindingTypes: ['cloud', 'aws', 'azure', 'gcp', 'misconfiguration'],
      },
      {
        id: 'cloud-access',
        name: 'Cloud Access Management',
        description: 'Cloud IAM and access controls',
        bestPractices: [
          'Implement least privilege for cloud IAM roles',
          'Enable MFA for all cloud console access',
          'Use cloud-native SSO integration',
          'Audit cloud access permissions regularly',
        ],
        relatedFindingTypes: ['iam', 'cloud-access', 's3', 'storage'],
      },
    ],
  },
  {
    id: 'governance-compliance',
    name: 'Governance & Compliance',
    description: 'Security governance, risk management, and compliance',
    subControls: [
      {
        id: 'risk-management',
        name: 'Risk Management',
        description: 'Cyber risk assessment and management',
        bestPractices: [
          'Maintain formal risk register with cyber risks',
          'Conduct annual risk assessments',
          'Implement risk-based decision making framework',
          'Report cyber risks to board/leadership regularly',
        ],
        relatedFindingTypes: ['risk', 'governance', 'compliance'],
      },
      {
        id: 'policy-procedures',
        name: 'Policies & Procedures',
        description: 'Security policies and procedures',
        bestPractices: [
          'Maintain comprehensive security policy framework',
          'Review and update policies annually',
          'Ensure policies are approved by leadership',
          'Communicate policies to all employees',
        ],
        relatedFindingTypes: ['policy', 'procedure', 'documentation'],
      },
      {
        id: 'compliance',
        name: 'Compliance Management',
        description: 'Regulatory compliance and certification',
        bestPractices: [
          'Identify applicable compliance requirements',
          'Conduct regular compliance audits',
          'Maintain evidence for compliance reporting',
          'Pursue relevant certifications (SOC 2, ISO 27001, etc.)',
        ],
        relatedFindingTypes: ['compliance', 'audit', 'regulation'],
      },
    ],
  },
  {
    id: 'business-continuity',
    name: 'Business Continuity',
    description: 'Business continuity and disaster recovery planning',
    subControls: [
      {
        id: 'bcdr-planning',
        name: 'BC/DR Planning',
        description: 'Business continuity and disaster recovery plans',
        bestPractices: [
          'Maintain documented business continuity plan',
          'Conduct annual DR testing exercises',
          'Define RTO/RPO for critical systems',
          'Establish crisis communication procedures',
        ],
        relatedFindingTypes: ['continuity', 'disaster', 'availability'],
      },
      {
        id: 'resilience',
        name: 'System Resilience',
        description: 'High availability and redundancy',
        bestPractices: [
          'Implement redundancy for critical systems',
          'Deploy geo-redundant infrastructure',
          'Monitor system availability and performance',
          'Implement automated failover mechanisms',
        ],
        relatedFindingTypes: ['availability', 'redundancy', 'failover'],
      },
    ],
  },
]

// Maturity level definitions
export enum MaturityLevel {
  FOUNDATIONAL = 'FOUNDATIONAL',
  DEVELOPING = 'DEVELOPING',
  MATURE = 'MATURE',
}

export interface MaturityDefinition {
  level: MaturityLevel
  description: string
  color: string
}

export const MATURITY_DEFINITIONS: Record<MaturityLevel, MaturityDefinition> = {
  [MaturityLevel.FOUNDATIONAL]: {
    level: MaturityLevel.FOUNDATIONAL,
    description:
      'Basic controls exist but are inconsistent, informal, or have significant gaps. Requires immediate attention to establish baseline security.',
    color: '#F87171', // red-400
  },
  [MaturityLevel.DEVELOPING]: {
    level: MaturityLevel.DEVELOPING,
    description:
      'Controls are defined and partially implemented, but not yet fully mature. Some gaps remain that should be addressed to improve security posture.',
    color: '#FBBF24', // yellow-400
  },
  [MaturityLevel.MATURE]: {
    level: MaturityLevel.MATURE,
    description:
      'Controls are well-defined, consistently implemented, and regularly reviewed. Represents strong security posture for this control area.',
    color: '#34D399', // green-400
  },
}

// Risk level definitions
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface RiskDefinition {
  level: RiskLevel
  description: string
  financialImpact: string
  color: string
}

export const RISK_DEFINITIONS: Record<RiskLevel, RiskDefinition> = {
  [RiskLevel.LOW]: {
    level: RiskLevel.LOW,
    description: 'Short-term cashflow impact. Limited business disruption expected.',
    financialImpact: 'Short-term cashflow impact',
    color: '#34D399', // green-400
  },
  [RiskLevel.MEDIUM]: {
    level: RiskLevel.MEDIUM,
    description: 'Significant but recoverable losses. Material business impact possible.',
    financialImpact: 'Significant but recoverable losses',
    color: '#FBBF24', // yellow-400
  },
  [RiskLevel.HIGH]: {
    level: RiskLevel.HIGH,
    description:
      'Potential insolvency risk. Critical business operations threatened.',
    financialImpact: 'Potential insolvency risk',
    color: '#F87171', // red-400
  },
}

// Priority level for recommendations
export enum PriorityLevel {
  IMMEDIATE = 'IMMEDIATE',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface PriorityDefinition {
  level: PriorityLevel
  description: string
  timeframe: string
  color: string
}

export const PRIORITY_DEFINITIONS: Record<PriorityLevel, PriorityDefinition> = {
  [PriorityLevel.IMMEDIATE]: {
    level: PriorityLevel.IMMEDIATE,
    description: 'Critical security gap requiring immediate remediation',
    timeframe: '0-1 months',
    color: '#EF4444', // red-500
  },
  [PriorityLevel.HIGH]: {
    level: PriorityLevel.HIGH,
    description: 'Significant risk requiring prompt attention',
    timeframe: '1-3 months',
    color: '#F97316', // orange-500
  },
  [PriorityLevel.MEDIUM]: {
    level: PriorityLevel.MEDIUM,
    description: 'Important improvement to security posture',
    timeframe: '3-6 months',
    color: '#FBBF24', // yellow-400
  },
  [PriorityLevel.LOW]: {
    level: PriorityLevel.LOW,
    description: 'Enhancement to strengthen overall security',
    timeframe: '6-12 months',
    color: '#60A5FA', // blue-400
  },
}

// Effort level for recommendations
export enum EffortLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface EffortDefinition {
  level: EffortLevel
  description: string
  color: string
}

export const EFFORT_DEFINITIONS: Record<EffortLevel, EffortDefinition> = {
  [EffortLevel.LOW]: {
    level: EffortLevel.LOW,
    description: 'Quick win - minimal effort and complexity',
    color: '#34D399', // green-400
  },
  [EffortLevel.MEDIUM]: {
    level: EffortLevel.MEDIUM,
    description: 'Moderate effort and complexity',
    color: '#FBBF24', // yellow-400
  },
  [EffortLevel.HIGH]: {
    level: EffortLevel.HIGH,
    description: 'Significant effort and complexity',
    color: '#F87171', // red-400
  },
}
