import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../utils/logger.js'
import {
  CONTROL_FRAMEWORK,
  MaturityLevel,
  RiskLevel,
  PriorityLevel,
  EffortLevel,
  ControlDomain,
} from './controlFramework.js'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Types for report assessment
export interface FindingData {
  id: string
  title: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  cvssScore?: number
  affectedSystems: string[]
  evidence?: string
  remediation: string
  status: string
}

export interface IOCData {
  id: string
  type: string
  value: string
  timestamp: Date
  context?: string
  source?: string
}

export interface TTPData {
  id: string
  mitreId: string
  tacticName: string
  techniqueName: string
  description?: string
  confidence: number
  aiAnalysis?: string
}

export interface ProjectData {
  name: string
  clientName: string
  assessmentType: string
  startDate: Date
  endDate?: Date
  findings: FindingData[]
  iocs: IOCData[]
  ttps: TTPData[]
  aiNarrative?: string
}

export interface ControlAssessment {
  controlId: string
  controlName: string
  subControlId: string
  subControlName: string
  maturity: MaturityLevel
  assessment: string
  linkedFindings: string[] // finding IDs
}

export interface ControlDomainAssessment {
  domainId: string
  domainName: string
  overallMaturity: MaturityLevel
  commentary: string
  subControls: ControlAssessment[]
  linkedRecommendations: number
}

export interface Recommendation {
  id: string
  title: string
  description: string
  priority: PriorityLevel
  effort: EffortLevel
  costEstimate?: {
    oneTime?: number
    monthly?: number
  }
  linkedControlIds: string[]
  linkedFindingIds: string[]
  deliveryType?: 'MSP' | 'PROJECT' | 'INTERNAL'
  implementationSteps?: string[]
}

export interface RiskAssessment {
  overallRisk: RiskLevel
  riskRating: string
  financialImpact: string
  keyRisks: string[]
  mitigatingFactors: string[]
  potentialReduction?: RiskLevel
  reductionTimeframe?: string
}

export interface ExecutiveSummary {
  headline: string
  overview: string
  keyFindings: string[]
  criticalRecommendations: string[]
}

export interface ReportAssessment {
  executiveSummary: ExecutiveSummary
  riskAssessment: RiskAssessment
  controlDomains: ControlDomainAssessment[]
  recommendations: Recommendation[]
  maturityDistribution: {
    mature: number
    developing: number
    foundational: number
  }
}

export class ReportAssessmentService {
  /**
   * Main entry point: Generate complete report assessment using AI
   */
  async generateReportAssessment(projectData: ProjectData): Promise<ReportAssessment> {
    try {
      logger.info(`Generating AI assessment for project: ${projectData.name}`)

      // Generate comprehensive assessment using AI
      const assessment = await this.generateAIAssessment(projectData)

      logger.info('Report assessment generated successfully')
      return assessment
    } catch (error: any) {
      logger.error('Report assessment generation failed:', error)
      throw new Error(`Report assessment failed: ${error.message}`)
    }
  }

  /**
   * Use AI to generate comprehensive assessment
   */
  private async generateAIAssessment(projectData: ProjectData): Promise<ReportAssessment> {
    const prompt = this.buildAssessmentPrompt(projectData)

    logger.info('Requesting AI assessment from Claude')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the AI response
    const assessment = this.parseAssessmentResponse(responseText, projectData)

    return assessment
  }

  /**
   * Build comprehensive prompt for AI assessment
   */
  private buildAssessmentPrompt(projectData: ProjectData): string {
    // Format findings summary
    const findingsSummary = this.formatFindingsSummary(projectData.findings)

    // Format IOCs summary
    const iocsSummary = this.formatIOCsSummary(projectData.iocs)

    // Format TTPs summary
    const ttpsSummary = this.formatTTPsSummary(projectData.ttps)

    // Get control framework
    const controlFramework = this.formatControlFramework()

    return `You are a senior cybersecurity consultant preparing a professional security assessment report for ${projectData.clientName}.

PROJECT INFORMATION:
- Client: ${projectData.clientName}
- Assessment Type: ${projectData.assessmentType}
- Project: ${projectData.name}
- Duration: ${new Date(projectData.startDate).toLocaleDateString()} - ${projectData.endDate ? new Date(projectData.endDate).toLocaleDateString() : 'Ongoing'}

${findingsSummary}

${iocsSummary}

${ttpsSummary}

${projectData.aiNarrative ? `THREAT INTELLIGENCE ANALYSIS:\n${projectData.aiNarrative}\n\n` : ''}SECURITY CONTROL FRAMEWORK:
${controlFramework}

YOUR TASK:
Analyze the findings, IOCs, and TTPs to create a comprehensive security assessment report. You must:

1. **Assess Overall Risk** (LOW/MEDIUM/HIGH) based on:
   - Severity and number of findings
   - Presence of threat activity (IOCs/TTPs)
   - Business impact potential
   - Current security posture

2. **Assess Each Control Domain** from the framework above:
   - Determine maturity level (FOUNDATIONAL/DEVELOPING/MATURE) for each sub-control
   - Link relevant findings to each control
   - Provide detailed commentary explaining the assessment
   - Identify gaps and strengths

3. **Generate Prioritized Recommendations**:
   - Create actionable recommendations addressing key gaps
   - Assign priority (IMMEDIATE/HIGH/MEDIUM/LOW)
   - Assign effort level (LOW/MEDIUM/HIGH)
   - Estimate costs (one-time and/or monthly)
   - Link to relevant controls and findings
   - Mark "Quick Wins" (HIGH priority + LOW effort)

4. **Write Executive Summary**:
   - Create compelling headline about risk level
   - Write 2-3 paragraph overview for non-technical audience
   - List 3-5 key findings
   - List 2-3 critical recommendations

Return your assessment in the following JSON format:

{
  "executiveSummary": {
    "headline": "We assess that [CLIENT] represents a [RISK LEVEL] risk of experiencing a major financial loss event due to a cyber security incident.",
    "overview": "Comprehensive paragraph explaining the assessment, highlighting key strengths and weaknesses. Written for executives, not technical audience.",
    "keyFindings": [
      "Key finding 1",
      "Key finding 2",
      "Key finding 3"
    ],
    "criticalRecommendations": [
      "Top recommendation 1",
      "Top recommendation 2"
    ]
  },
  "riskAssessment": {
    "overallRisk": "MEDIUM",
    "riskRating": "Detailed explanation of the risk rating",
    "financialImpact": "Assessment of potential financial impact",
    "keyRisks": [
      "Primary risk area 1",
      "Primary risk area 2"
    ],
    "mitigatingFactors": [
      "Positive security control 1",
      "Positive security control 2"
    ],
    "potentialReduction": "LOW",
    "reductionTimeframe": "12 months"
  },
  "controlDomains": [
    {
      "domainId": "security-operations",
      "domainName": "Security Operations",
      "overallMaturity": "DEVELOPING",
      "commentary": "2-3 paragraph assessment of this domain, explaining strengths, weaknesses, and key concerns. Reference specific findings.",
      "linkedRecommendations": 3,
      "subControls": [
        {
          "controlId": "security-operations",
          "controlName": "Security Operations",
          "subControlId": "endpoint-protection",
          "subControlName": "Endpoint Protection",
          "maturity": "MATURE",
          "assessment": "Detailed assessment of this specific control. Explain why you chose this maturity level. Reference relevant findings.",
          "linkedFindings": ["finding-id-1", "finding-id-2"]
        }
      ]
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Implement Centralized Logging",
      "description": "Detailed description of the recommendation, including what needs to be done, why it's important, and expected outcomes.",
      "priority": "HIGH",
      "effort": "MEDIUM",
      "costEstimate": {
        "oneTime": 5000,
        "monthly": 500
      },
      "linkedControlIds": ["security-operations"],
      "linkedFindingIds": ["finding-id-1"],
      "deliveryType": "MSP",
      "implementationSteps": [
        "Step 1: Deploy SIEM solution",
        "Step 2: Configure log forwarding",
        "Step 3: Create alerting rules"
      ]
    }
  ]
}

IMPORTANT GUIDELINES:
- Be specific and reference actual findings from the data provided
- Use professional, consultant-level language
- Focus on business impact, not just technical details
- Provide actionable, practical recommendations
- Estimate realistic costs based on typical MSP/security service pricing
- Identify "Quick Wins" (HIGH priority + LOW effort)
- Ensure all findings are mapped to relevant controls
- Return ONLY valid JSON, no additional text

Generate the assessment now:`
  }

  /**
   * Format findings for prompt
   */
  private formatFindingsSummary(findings: FindingData[]): string {
    if (findings.length === 0) {
      return 'FINDINGS: No security findings documented for this assessment.'
    }

    const bySeverity = findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const summary = Object.entries(bySeverity)
      .map(([sev, count]) => `${count} ${sev}`)
      .join(', ')

    const detailedFindings = findings
      .map(
        (f, idx) => `${idx + 1}. [${f.severity}] ${f.title}
   Description: ${f.description.substring(0, 300)}${f.description.length > 300 ? '...' : ''}
   Affected Systems: ${f.affectedSystems.join(', ')}
   ${f.cvssScore ? `CVSS Score: ${f.cvssScore}` : ''}
   Remediation: ${f.remediation.substring(0, 200)}${f.remediation.length > 200 ? '...' : ''}
   Finding ID: ${f.id}`,
      )
      .join('\n\n')

    return `SECURITY FINDINGS (${findings.length} total: ${summary}):
${detailedFindings}`
  }

  /**
   * Format IOCs for prompt
   */
  private formatIOCsSummary(iocs: IOCData[]): string {
    if (iocs.length === 0) {
      return ''
    }

    const iocList = iocs
      .slice(0, 20) // Limit to first 20 for prompt size
      .map(
        (ioc, idx) => `${idx + 1}. [${ioc.type}] ${ioc.value}
   Timestamp: ${new Date(ioc.timestamp).toISOString()}
   ${ioc.context ? `Context: ${ioc.context}` : ''}
   ${ioc.source ? `Source: ${ioc.source}` : ''}`,
      )
      .join('\n\n')

    return `INDICATORS OF COMPROMISE (${iocs.length} total):
${iocList}
${iocs.length > 20 ? '\n... and ' + (iocs.length - 20) + ' more IOCs' : ''}`
  }

  /**
   * Format TTPs for prompt
   */
  private formatTTPsSummary(ttps: TTPData[]): string {
    if (ttps.length === 0) {
      return ''
    }

    const ttpList = ttps
      .map(
        (ttp, idx) => `${idx + 1}. ${ttp.mitreId} - ${ttp.techniqueName}
   Tactic: ${ttp.tacticName}
   Confidence: ${(ttp.confidence * 100).toFixed(0)}%
   ${ttp.description ? `Description: ${ttp.description}` : ''}
   ${ttp.aiAnalysis ? `Analysis: ${ttp.aiAnalysis.substring(0, 200)}...` : ''}`,
      )
      .join('\n\n')

    return `MITRE ATT&CK TECHNIQUES IDENTIFIED (${ttps.length} total):
${ttpList}`
  }

  /**
   * Format control framework for prompt
   */
  private formatControlFramework(): string {
    return CONTROL_FRAMEWORK.map(
      (domain) => `${domain.name} (${domain.id}):
  ${domain.description}
  Sub-controls: ${domain.subControls.map((sc) => `${sc.name} (${sc.id})`).join(', ')}`,
    ).join('\n\n')
  }

  /**
   * Parse AI assessment response
   */
  private parseAssessmentResponse(
    responseText: string,
    projectData: ProjectData,
  ): ReportAssessment {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Calculate maturity distribution
      const maturityDistribution = this.calculateMaturityDistribution(
        parsed.controlDomains || [],
      )

      return {
        executiveSummary: parsed.executiveSummary || this.generateFallbackExecutiveSummary(projectData),
        riskAssessment: parsed.riskAssessment || this.generateFallbackRiskAssessment(projectData),
        controlDomains: parsed.controlDomains || [],
        recommendations: parsed.recommendations || [],
        maturityDistribution,
      }
    } catch (error: any) {
      logger.error('Failed to parse AI assessment response:', error)
      logger.debug('Response text:', responseText)

      // Return fallback assessment
      return this.generateFallbackAssessment(projectData)
    }
  }

  /**
   * Calculate maturity distribution from control assessments
   */
  private calculateMaturityDistribution(
    domains: ControlDomainAssessment[],
  ): { mature: number; developing: number; foundational: number } {
    const distribution = {
      mature: 0,
      developing: 0,
      foundational: 0,
    }

    domains.forEach((domain) => {
      domain.subControls.forEach((subControl) => {
        if (subControl.maturity === MaturityLevel.MATURE) {
          distribution.mature++
        } else if (subControl.maturity === MaturityLevel.DEVELOPING) {
          distribution.developing++
        } else if (subControl.maturity === MaturityLevel.FOUNDATIONAL) {
          distribution.foundational++
        }
      })
    })

    return distribution
  }

  /**
   * Generate fallback executive summary if AI fails
   */
  private generateFallbackExecutiveSummary(projectData: ProjectData): ExecutiveSummary {
    const criticalCount = projectData.findings.filter((f) => f.severity === 'CRITICAL').length
    const highCount = projectData.findings.filter((f) => f.severity === 'HIGH').length

    const riskLevel = criticalCount > 0 || highCount > 3 ? 'HIGH' : highCount > 0 ? 'MEDIUM' : 'LOW'

    return {
      headline: `We assess that ${projectData.clientName} represents a ${riskLevel} risk of experiencing a major financial loss event due to a cyber security incident.`,
      overview: `This assessment identified ${projectData.findings.length} security findings across the organization's IT infrastructure. The assessment revealed a mix of security strengths and areas requiring improvement.`,
      keyFindings: projectData.findings
        .slice(0, 3)
        .map((f) => `${f.severity}: ${f.title}`),
      criticalRecommendations: ['Review and remediate critical findings', 'Implement recommended security controls'],
    }
  }

  /**
   * Generate fallback risk assessment if AI fails
   */
  private generateFallbackRiskAssessment(projectData: ProjectData): RiskAssessment {
    const criticalCount = projectData.findings.filter((f) => f.severity === 'CRITICAL').length
    const highCount = projectData.findings.filter((f) => f.severity === 'HIGH').length

    const overallRisk: RiskLevel = criticalCount > 0 || highCount > 3 ? RiskLevel.HIGH : highCount > 0 ? RiskLevel.MEDIUM : RiskLevel.LOW

    return {
      overallRisk,
      riskRating: `Based on ${projectData.findings.length} findings identified during this assessment.`,
      financialImpact: 'Potential for significant business impact from security incidents.',
      keyRisks: projectData.findings
        .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
        .slice(0, 3)
        .map((f) => f.title),
      mitigatingFactors: [],
      potentialReduction: overallRisk === RiskLevel.HIGH ? RiskLevel.MEDIUM : RiskLevel.LOW,
      reductionTimeframe: '12 months',
    }
  }

  /**
   * Generate complete fallback assessment
   */
  private generateFallbackAssessment(projectData: ProjectData): ReportAssessment {
    return {
      executiveSummary: this.generateFallbackExecutiveSummary(projectData),
      riskAssessment: this.generateFallbackRiskAssessment(projectData),
      controlDomains: [],
      recommendations: [],
      maturityDistribution: {
        mature: 0,
        developing: 0,
        foundational: 0,
      },
    }
  }
}

export const reportAssessmentService = new ReportAssessmentService()
