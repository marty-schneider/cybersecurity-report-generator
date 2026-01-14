import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Enums matching Prisma schema
export enum IOCType {
  IP_ADDRESS = 'IP_ADDRESS',
  DOMAIN = 'DOMAIN',
  URL = 'URL',
  FILE_HASH_MD5 = 'FILE_HASH_MD5',
  FILE_HASH_SHA1 = 'FILE_HASH_SHA1',
  FILE_HASH_SHA256 = 'FILE_HASH_SHA256',
  EMAIL = 'EMAIL',
  CVE = 'CVE',
  REGISTRY_KEY = 'REGISTRY_KEY',
  MUTEX = 'MUTEX',
  USER_AGENT = 'USER_AGENT',
  CERTIFICATE = 'CERTIFICATE',
  FILE_PATH = 'FILE_PATH',
  COMMAND_LINE = 'COMMAND_LINE',
}

export enum Severity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

// CVE Data structure
export interface CVEData {
  id: string
  description?: string
  cvssScore?: number
  cvssVector?: string
  severity?: string
  publishedDate?: string
  lastModifiedDate?: string
  references?: string[]
  affectedProducts?: string[]
  exploitAvailable?: boolean
}

// Input interface for remediation generation
export interface RemediationInput {
  ioc: {
    type: IOCType
    value: string
    timestamp: Date
    context?: string
  }
  cveData?: CVEData
  affectedSystems?: string[]
}

// Output interface for generated remediation
export interface RemediationOutput {
  title: string
  description: string
  remediation: string
  technicalRemediation: string
  executiveSummary: string
  affectedSystems: string[]
  evidence: string
  suggestedSeverity: Severity
}

export class RemediationService {
  /**
   * Generate comprehensive finding details from IOC data using AI
   */
  async generateRemediation(input: RemediationInput): Promise<RemediationOutput> {
    try {
      logger.info(`Generating remediation for IOC type: ${input.ioc.type}, value: ${input.ioc.value}`)

      const prompt = this.buildRemediationPrompt(input)

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.3,
        system: 'You are a cybersecurity remediation specialist with expertise in incident response, vulnerability management, and security operations. Your role is to provide clear, actionable guidance for addressing security threats and vulnerabilities.',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse the structured response
      const result = this.parseRemediationResponse(responseText, input)

      logger.info('Remediation generation completed successfully')

      return result
    } catch (error: any) {
      logger.error('Remediation generation failed:', error)

      // Return fallback remediation instead of throwing
      return this.generateFallbackRemediation(input)
    }
  }

  /**
   * Build AI prompt based on IOC type and available data
   */
  private buildRemediationPrompt(input: RemediationInput): string {
    const { ioc, cveData, affectedSystems } = input
    const timestamp = new Date(ioc.timestamp).toISOString()

    // Build IOC-specific context
    const iocContext = this.buildIOCContext(ioc)

    // Build CVE context if available
    const cveContext = cveData ? this.buildCVEContext(cveData) : ''

    // Build affected systems context
    const systemsContext = affectedSystems && affectedSystems.length > 0
      ? `\nAFFECTED SYSTEMS:\n${affectedSystems.map((sys, idx) => `${idx + 1}. ${sys}`).join('\n')}`
      : ''

    return `I need you to generate comprehensive finding details for a security incident based on the following Indicator of Compromise (IOC).

IOC DETAILS:
- Type: ${ioc.type}
- Value: ${ioc.value}
- Detected: ${timestamp}
${ioc.context ? `- Context: ${ioc.context}` : ''}

${iocContext}

${cveContext}

${systemsContext}

Please provide your analysis in the following JSON format:

{
  "title": "Concise, actionable title for this finding (max 100 characters)",
  "description": "Technical description of the threat or vulnerability. Explain what this IOC represents, the attack vector, and potential impact. 2-3 detailed paragraphs. Include technical details about how the attack works or how the vulnerability could be exploited.",
  "remediation": "High-level remediation guidance in paragraph form. Explain the overall approach to addressing this finding, including both immediate containment and long-term fixes. 2-3 paragraphs for non-technical audience.",
  "technicalRemediation": "Detailed technical remediation steps. Provide numbered, actionable steps with specific commands where applicable. Include:\n1. Immediate containment actions\n2. Investigation steps\n3. Eradication procedures\n4. Recovery steps\n5. Prevention measures\n\nInclude specific commands, file paths, registry keys, or configuration changes as appropriate.",
  "executiveSummary": "Executive summary in 1 paragraph. Focus on business impact, risk level, and recommended actions. Written for C-level audience without technical jargon.",
  "evidence": "Description of evidence that supports this finding. Explain what was observed, where it was found, and how it indicates a security issue. Reference the IOC details and any additional context provided.",
  "suggestedSeverity": "CRITICAL|HIGH|MEDIUM|LOW|INFO"
}

SEVERITY GUIDANCE:
- CRITICAL: Active exploitation, remote code execution, data exfiltration, or critical CVE (CVSS 9.0-10.0)
- HIGH: High-risk vulnerability, privilege escalation, or significant security control failure (CVSS 7.0-8.9)
- MEDIUM: Moderate risk, requires authentication, or limited impact (CVSS 4.0-6.9)
- LOW: Low risk, difficult to exploit, or minimal impact (CVSS 0.1-3.9)
- INFO: Informational finding, best practice recommendation

IMPORTANT GUIDELINES:
- Be specific and actionable in all recommendations
- Reference the IOC type and value in your description and evidence
- For CVEs, base severity on CVSS score and exploitability
- For network IOCs (IP/Domain/URL), focus on network-based containment
- For file hashes, provide malware removal and system hardening steps
- Include specific commands using proper syntax (PowerShell, bash, etc.)
- Consider the affected systems when providing remediation steps
- Return ONLY valid JSON, no additional text before or after

Generate the finding details now:`
  }

  /**
   * Build IOC-specific context based on type
   */
  private buildIOCContext(ioc: { type: IOCType; value: string; context?: string }): string {
    switch (ioc.type) {
      case IOCType.CVE:
        return `This is a Common Vulnerabilities and Exposures (CVE) identifier. Provide remediation focused on patching, mitigation, and compensating controls.`

      case IOCType.IP_ADDRESS:
        return `This is a suspicious IP address. Focus remediation on network-based containment, firewall rules, and investigating connections to/from this IP.`

      case IOCType.DOMAIN:
        return `This is a malicious or suspicious domain. Focus remediation on DNS blocking, proxy filtering, and identifying systems that contacted this domain.`

      case IOCType.URL:
        return `This is a malicious URL. Focus remediation on web filtering, endpoint protection, and investigating which systems accessed this URL.`

      case IOCType.FILE_HASH_MD5:
      case IOCType.FILE_HASH_SHA1:
      case IOCType.FILE_HASH_SHA256:
        return `This is a file hash indicating malicious software. Focus remediation on malware removal, system reimaging if necessary, and preventing future infections.`

      case IOCType.EMAIL:
        return `This is a suspicious email address. Focus remediation on email filtering, user awareness, and investigating phishing attempts.`

      case IOCType.REGISTRY_KEY:
        return `This is a suspicious Windows registry key. Focus remediation on removing malicious registry entries, investigating persistence mechanisms, and system hardening.`

      case IOCType.MUTEX:
        return `This is a mutex used by malware for synchronization. Focus remediation on identifying and removing associated malware, and investigating process activity.`

      case IOCType.USER_AGENT:
        return `This is a suspicious User-Agent string. Focus remediation on identifying malicious tools or scripts, and implementing detection rules.`

      case IOCType.CERTIFICATE:
        return `This is a suspicious certificate. Focus remediation on certificate revocation, trust store updates, and investigating man-in-the-middle attacks.`

      case IOCType.FILE_PATH:
        return `This is a suspicious file path. Focus remediation on file removal, investigating what created this file, and preventing similar attacks.`

      case IOCType.COMMAND_LINE:
        return `This is a suspicious command line. Focus remediation on process investigation, identifying lateral movement or privilege escalation, and implementing application whitelisting.`

      default:
        return `Analyze this IOC and provide appropriate remediation guidance based on its characteristics.`
    }
  }

  /**
   * Build CVE-specific context
   */
  private buildCVEContext(cveData: CVEData): string {
    let context = `\nCVE INFORMATION:`

    context += `\n- CVE ID: ${cveData.id}`

    if (cveData.description) {
      context += `\n- Description: ${cveData.description}`
    }

    if (cveData.cvssScore !== undefined) {
      context += `\n- CVSS Score: ${cveData.cvssScore}/10.0`
    }

    if (cveData.cvssVector) {
      context += `\n- CVSS Vector: ${cveData.cvssVector}`
    }

    if (cveData.severity) {
      context += `\n- Severity: ${cveData.severity}`
    }

    if (cveData.publishedDate) {
      context += `\n- Published: ${cveData.publishedDate}`
    }

    if (cveData.exploitAvailable !== undefined) {
      context += `\n- Exploit Available: ${cveData.exploitAvailable ? 'YES - Active exploitation likely' : 'No public exploits known'}`
    }

    if (cveData.affectedProducts && cveData.affectedProducts.length > 0) {
      context += `\n- Affected Products: ${cveData.affectedProducts.join(', ')}`
    }

    if (cveData.references && cveData.references.length > 0) {
      context += `\n- References: ${cveData.references.slice(0, 3).join(', ')}`
    }

    return context
  }

  /**
   * Parse AI response into structured output
   */
  private parseRemediationResponse(responseText: string, input: RemediationInput): RemediationOutput {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validate required fields
      if (!parsed.title || !parsed.description || !parsed.remediation) {
        throw new Error('Missing required fields in AI response')
      }

      // Validate and normalize severity
      const severity = this.normalizeSeverity(parsed.suggestedSeverity, input)

      return {
        title: parsed.title,
        description: parsed.description,
        remediation: parsed.remediation,
        technicalRemediation: parsed.technicalRemediation || parsed.remediation,
        executiveSummary: parsed.executiveSummary || this.generateFallbackExecutiveSummary(parsed.title, severity),
        affectedSystems: input.affectedSystems || [],
        evidence: parsed.evidence || `IOC detected: ${input.ioc.type} - ${input.ioc.value}`,
        suggestedSeverity: severity,
      }
    } catch (error: any) {
      logger.error('Failed to parse AI remediation response:', error)
      logger.debug('Response text:', responseText.substring(0, 500))

      // Return fallback remediation
      return this.generateFallbackRemediation(input)
    }
  }

  /**
   * Normalize and validate severity level
   */
  private normalizeSeverity(aiSeverity: string, input: RemediationInput): Severity {
    // First, try to use AI-suggested severity
    const normalizedAI = aiSeverity?.toUpperCase()
    if (Object.values(Severity).includes(normalizedAI as Severity)) {
      return normalizedAI as Severity
    }

    // Fallback: determine severity based on CVE data
    if (input.cveData?.cvssScore !== undefined) {
      const cvss = input.cveData.cvssScore
      if (cvss >= 9.0) return Severity.CRITICAL
      if (cvss >= 7.0) return Severity.HIGH
      if (cvss >= 4.0) return Severity.MEDIUM
      return Severity.LOW
    }

    // Fallback: determine severity based on IOC type
    switch (input.ioc.type) {
      case IOCType.CVE:
        return Severity.HIGH // Default for CVEs without CVSS
      case IOCType.FILE_HASH_MD5:
      case IOCType.FILE_HASH_SHA1:
      case IOCType.FILE_HASH_SHA256:
        return Severity.HIGH // Malware is generally high severity
      case IOCType.IP_ADDRESS:
      case IOCType.DOMAIN:
      case IOCType.URL:
        return Severity.MEDIUM // Network indicators are medium by default
      case IOCType.COMMAND_LINE:
      case IOCType.REGISTRY_KEY:
        return Severity.MEDIUM // Suspicious activity indicators
      default:
        return Severity.LOW // Conservative default
    }
  }

  /**
   * Generate fallback executive summary
   */
  private generateFallbackExecutiveSummary(title: string, severity: Severity): string {
    const severityText = severity === Severity.CRITICAL || severity === Severity.HIGH
      ? 'significant security risk'
      : severity === Severity.MEDIUM
      ? 'moderate security risk'
      : 'low security risk'

    return `This finding represents a ${severityText} that requires attention. ${title}. Immediate remediation is recommended to reduce organizational risk and prevent potential security incidents.`
  }

  /**
   * Generate fallback remediation when AI fails
   */
  private generateFallbackRemediation(input: RemediationInput): RemediationOutput {
    const { ioc, cveData, affectedSystems } = input
    const severity = this.normalizeSeverity('', input)

    // Generate basic title
    const title = cveData
      ? `${cveData.id}: Vulnerability Detected`
      : `Suspicious ${this.formatIOCType(ioc.type)} Detected: ${ioc.value}`

    // Generate basic description
    const description = cveData && cveData.description
      ? `A vulnerability has been identified: ${cveData.description}`
      : `A suspicious ${this.formatIOCType(ioc.type)} has been detected in the environment. The indicator "${ioc.value}" was observed on ${new Date(ioc.timestamp).toISOString()}. ${ioc.context ? `Context: ${ioc.context}` : ''} This requires investigation and remediation to ensure system security.`

    // Generate basic remediation
    const remediation = this.generateBasicRemediation(ioc.type, cveData)

    // Generate basic technical remediation
    const technicalRemediation = this.generateBasicTechnicalRemediation(ioc.type, ioc.value)

    return {
      title,
      description,
      remediation,
      technicalRemediation,
      executiveSummary: this.generateFallbackExecutiveSummary(title, severity),
      affectedSystems: affectedSystems || [],
      evidence: `IOC Type: ${ioc.type}\nIOC Value: ${ioc.value}\nDetection Time: ${new Date(ioc.timestamp).toISOString()}\n${ioc.context ? `Context: ${ioc.context}` : ''}`,
      suggestedSeverity: severity,
    }
  }

  /**
   * Format IOC type for display
   */
  private formatIOCType(type: IOCType): string {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())
  }

  /**
   * Generate basic remediation guidance based on IOC type
   */
  private generateBasicRemediation(type: IOCType, cveData?: CVEData): string {
    if (cveData) {
      return `A vulnerability (${cveData.id}) has been identified that requires remediation. Apply the latest security patches from the vendor to address this vulnerability. If patching is not immediately possible, implement compensating controls such as network segmentation, access restrictions, or application firewalls. Monitor affected systems for signs of exploitation and maintain an inventory of all systems that may be affected by this vulnerability.`
    }

    switch (type) {
      case IOCType.IP_ADDRESS:
      case IOCType.DOMAIN:
      case IOCType.URL:
        return `Block this indicator at the network perimeter using firewalls and web proxies. Review logs to identify any systems that have communicated with this indicator. Investigate affected systems for signs of compromise and implement monitoring to detect future connection attempts.`

      case IOCType.FILE_HASH_MD5:
      case IOCType.FILE_HASH_SHA1:
      case IOCType.FILE_HASH_SHA256:
        return `Immediately quarantine or delete files matching this hash. Scan all systems for the presence of this malicious file using updated antivirus signatures. Investigate how the malware was introduced and implement controls to prevent similar infections. Consider reimaging severely compromised systems.`

      case IOCType.EMAIL:
        return `Block this email address at the email gateway. Review email logs to identify users who may have received messages from this sender. Provide security awareness training to users about phishing threats. Implement additional email security controls such as SPF, DKIM, and DMARC.`

      case IOCType.REGISTRY_KEY:
        return `Remove malicious registry entries from affected systems. Investigate the source of the registry modification and identify any associated malware. Implement registry monitoring to detect unauthorized changes. Consider using application whitelisting to prevent malicious software execution.`

      default:
        return `Investigate this indicator to determine its impact on your environment. Implement appropriate containment measures based on your findings. Review security logs for related activity. Update security controls to detect and prevent similar threats in the future.`
    }
  }

  /**
   * Generate basic technical remediation steps
   */
  private generateBasicTechnicalRemediation(type: IOCType, value: string): string {
    switch (type) {
      case IOCType.IP_ADDRESS:
        return `1. Block IP address at firewall:\n   - Add deny rule for ${value}\n   - Example (iptables): sudo iptables -A INPUT -s ${value} -j DROP\n   - Example (Windows): New-NetFirewallRule -DisplayName "Block ${value}" -Direction Inbound -RemoteAddress ${value} -Action Block\n\n2. Search logs for connections:\n   - Review firewall logs\n   - Check proxy logs\n   - Examine endpoint EDR logs\n\n3. Investigate affected systems:\n   - Run antivirus scans\n   - Check for suspicious processes\n   - Review scheduled tasks and startup items`

      case IOCType.DOMAIN:
        return `1. Block domain at DNS/proxy level:\n   - Add ${value} to DNS blacklist\n   - Configure web proxy to block the domain\n\n2. Search for DNS queries:\n   - Review DNS logs: grep "${value}" /var/log/named.log\n   - Check proxy logs for access attempts\n\n3. Investigate systems that contacted the domain:\n   - Run endpoint scans\n   - Review browser history\n   - Check for malicious browser extensions`

      case IOCType.FILE_HASH_SHA256:
        return `1. Search for file across environment:\n   - Windows: Get-ChildItem -Path C:\\ -Recurse | Get-FileHash -Algorithm SHA256 | Where-Object Hash -eq "${value}"\n   - Linux: find / -type f -exec sha256sum {} \\; | grep "${value}"\n\n2. Quarantine/delete the file:\n   - Move to isolated location for analysis\n   - Delete if confirmed malicious\n\n3. Scan affected systems:\n   - Run full antivirus scan\n   - Use EDR tools to check for persistence\n   - Review system for additional IOCs\n\n4. Implement prevention:\n   - Update antivirus signatures\n   - Configure application whitelisting\n   - Deploy EDR rules to detect similar files`

      case IOCType.REGISTRY_KEY:
        return `1. Check for registry key existence:\n   - reg query "${value}"\n   - PowerShell: Test-Path "Registry::${value}"\n\n2. Delete malicious registry key:\n   - reg delete "${value}" /f\n   - PowerShell: Remove-Item -Path "Registry::${value}" -Recurse -Force\n\n3. Investigate related activity:\n   - Check for associated files\n   - Review process creation logs\n   - Examine scheduled tasks\n\n4. Implement monitoring:\n   - Enable registry auditing\n   - Deploy SIEM rules for registry changes`

      default:
        return `1. Identify affected systems containing this indicator\n\n2. Isolate affected systems from the network if necessary\n\n3. Collect forensic data for analysis\n\n4. Remove or remediate the indicator\n\n5. Restore systems to known good state\n\n6. Implement monitoring to detect recurrence\n\n7. Update security controls to prevent similar incidents`
    }
  }
}

export const remediationService = new RemediationService()
