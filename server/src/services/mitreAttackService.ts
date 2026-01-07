import { logger } from '../utils/logger.js'

interface MitreTechnique {
  id: string
  name: string
  description: string
  tactics: string[]
  url: string
  detection?: string
  mitigation?: string
}

// Subset of commonly used MITRE ATT&CK techniques
// In production, this would be loaded from the official MITRE ATT&CK STIX data
const MITRE_TECHNIQUES: Record<string, MitreTechnique> = {
  'T1566.001': {
    id: 'T1566.001',
    name: 'Phishing: Spearphishing Attachment',
    description: 'Adversaries may send spearphishing emails with a malicious attachment in an attempt to gain access to victim systems.',
    tactics: ['Initial Access'],
    url: 'https://attack.mitre.org/techniques/T1566/001/',
    detection: 'Network intrusion detection systems and email gateways can be used to detect spearphishing with malicious attachments.',
    mitigation: 'User training and anti-virus/anti-malware solutions can help prevent execution of malicious attachments.',
  },
  'T1059.001': {
    id: 'T1059.001',
    name: 'Command and Scripting Interpreter: PowerShell',
    description: 'Adversaries may abuse PowerShell commands and scripts for execution.',
    tactics: ['Execution'],
    url: 'https://attack.mitre.org/techniques/T1059/001/',
    detection: 'Monitor PowerShell execution and command-line parameters for suspicious activity.',
    mitigation: 'Disable or restrict PowerShell usage to only necessary users and use application control.',
  },
  'T1059.003': {
    id: 'T1059.003',
    name: 'Command and Scripting Interpreter: Windows Command Shell',
    description: 'Adversaries may abuse the Windows command shell for execution.',
    tactics: ['Execution'],
    url: 'https://attack.mitre.org/techniques/T1059/003/',
    detection: 'Monitor executed commands and arguments for suspicious activity.',
    mitigation: 'Use application control to restrict execution of cmd.exe.',
  },
  'T1071.001': {
    id: 'T1071.001',
    name: 'Application Layer Protocol: Web Protocols',
    description: 'Adversaries may communicate using application layer protocols associated with web traffic to avoid detection.',
    tactics: ['Command and Control'],
    url: 'https://attack.mitre.org/techniques/T1071/001/',
    detection: 'Monitor network traffic for suspicious connections and unusual traffic patterns.',
    mitigation: 'Network intrusion detection and prevention systems can be used to identify suspicious web traffic.',
  },
  'T1105': {
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    description: 'Adversaries may transfer tools or other files from an external system into a compromised environment.',
    tactics: ['Command and Control'],
    url: 'https://attack.mitre.org/techniques/T1105/',
    detection: 'Monitor for file creation and files transferred into the network.',
    mitigation: 'Network intrusion prevention systems can be used to block downloads of known malicious files.',
  },
  'T1486': {
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    description: 'Adversaries may encrypt data on target systems or on large numbers of systems in a network to interrupt availability.',
    tactics: ['Impact'],
    url: 'https://attack.mitre.org/techniques/T1486/',
    detection: 'Monitor for suspicious file modification activity, especially large-scale encryption.',
    mitigation: 'Maintain regular backups and use application control to prevent unauthorized encryption tools.',
  },
  'T1047': {
    id: 'T1047',
    name: 'Windows Management Instrumentation',
    description: 'Adversaries may abuse Windows Management Instrumentation (WMI) to execute malicious commands and payloads.',
    tactics: ['Execution'],
    url: 'https://attack.mitre.org/techniques/T1047/',
    detection: 'Monitor WMI event subscription and command execution.',
    mitigation: 'Restrict WMI usage to only necessary users and systems.',
  },
  'T1055': {
    id: 'T1055',
    name: 'Process Injection',
    description: 'Adversaries may inject code into processes in order to evade process-based defenses or elevate privileges.',
    tactics: ['Defense Evasion', 'Privilege Escalation'],
    url: 'https://attack.mitre.org/techniques/T1055/',
    detection: 'Monitor for suspicious process behavior and memory modifications.',
    mitigation: 'Utilize security tools that can detect and prevent process injection techniques.',
  },
  'T1027': {
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    description: 'Adversaries may attempt to make an executable or file difficult to discover or analyze.',
    tactics: ['Defense Evasion'],
    url: 'https://attack.mitre.org/techniques/T1027/',
    detection: 'Monitor for files with uncommon characteristics or suspicious content.',
    mitigation: 'Use anti-virus and file analysis tools to detect obfuscated malware.',
  },
  'T1543.003': {
    id: 'T1543.003',
    name: 'Create or Modify System Process: Windows Service',
    description: 'Adversaries may create or modify Windows services to repeatedly execute malicious payloads.',
    tactics: ['Persistence', 'Privilege Escalation'],
    url: 'https://attack.mitre.org/techniques/T1543/003/',
    detection: 'Monitor for new services or modifications to existing services.',
    mitigation: 'Restrict permissions to modify services and monitor service creation.',
  },
  'T1082': {
    id: 'T1082',
    name: 'System Information Discovery',
    description: 'An adversary may attempt to get detailed information about the operating system and hardware.',
    tactics: ['Discovery'],
    url: 'https://attack.mitre.org/techniques/T1082/',
    detection: 'Monitor executed commands and arguments that may gather system information.',
    mitigation: 'This technique is difficult to mitigate as it involves normal system commands.',
  },
  'T1090': {
    id: 'T1090',
    name: 'Proxy',
    description: 'Adversaries may use a connection proxy to direct network traffic between systems or act as an intermediary.',
    tactics: ['Command and Control'],
    url: 'https://attack.mitre.org/techniques/T1090/',
    detection: 'Monitor for suspicious proxy usage and unusual network connections.',
    mitigation: 'Use network intrusion prevention to block malicious proxy connections.',
  },
  'T1204.002': {
    id: 'T1204.002',
    name: 'User Execution: Malicious File',
    description: 'An adversary may rely upon a user opening a malicious file in order to gain execution.',
    tactics: ['Execution'],
    url: 'https://attack.mitre.org/techniques/T1204/002/',
    detection: 'Monitor for execution of files downloaded from the internet.',
    mitigation: 'User training and application control can help prevent malicious file execution.',
  },
  'T1570': {
    id: 'T1570',
    name: 'Lateral Tool Transfer',
    description: 'Adversaries may transfer tools or other files between systems in a compromised environment.',
    tactics: ['Lateral Movement'],
    url: 'https://attack.mitre.org/techniques/T1570/',
    detection: 'Monitor for file transfers between internal systems.',
    mitigation: 'Network segmentation can limit lateral movement.',
  },
  'T1003.001': {
    id: 'T1003.001',
    name: 'OS Credential Dumping: LSASS Memory',
    description: 'Adversaries may attempt to access credential material stored in the process memory of LSASS.',
    tactics: ['Credential Access'],
    url: 'https://attack.mitre.org/techniques/T1003/001/',
    detection: 'Monitor for suspicious access to LSASS process memory.',
    mitigation: 'Enable Credential Guard and restrict access to LSASS.',
  },
}

export class MitreAttackService {
  getTechnique(techniqueId: string): MitreTechnique | null {
    return MITRE_TECHNIQUES[techniqueId] || null
  }

  getAllTechniques(): MitreTechnique[] {
    return Object.values(MITRE_TECHNIQUES)
  }

  searchTechniques(query: string): MitreTechnique[] {
    const lowerQuery = query.toLowerCase()
    return Object.values(MITRE_TECHNIQUES).filter(
      (tech) =>
        tech.id.toLowerCase().includes(lowerQuery) ||
        tech.name.toLowerCase().includes(lowerQuery) ||
        tech.description.toLowerCase().includes(lowerQuery)
    )
  }

  getTechniquesByTactic(tactic: string): MitreTechnique[] {
    return Object.values(MITRE_TECHNIQUES).filter((tech) =>
      tech.tactics.some((t) => t.toLowerCase() === tactic.toLowerCase())
    )
  }

  validateTechniqueId(techniqueId: string): boolean {
    return !!MITRE_TECHNIQUES[techniqueId]
  }

  // Get techniques organized by tactic for visualization
  getTechniqueMatrix(): Record<string, MitreTechnique[]> {
    const matrix: Record<string, MitreTechnique[]> = {}

    Object.values(MITRE_TECHNIQUES).forEach((tech) => {
      tech.tactics.forEach((tactic) => {
        if (!matrix[tactic]) {
          matrix[tactic] = []
        }
        matrix[tactic].push(tech)
      })
    })

    return matrix
  }
}

export const mitreAttackService = new MitreAttackService()
