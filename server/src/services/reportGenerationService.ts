import Handlebars from 'handlebars'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '../utils/logger.js'
import { reportAssessmentService, ProjectData } from './reportAssessmentService.js'
import { MATURITY_DEFINITIONS, RISK_DEFINITIONS, PRIORITY_DEFINITIONS, EFFORT_DEFINITIONS } from './controlFramework.js'
import { prisma } from '../utils/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Register Handlebars helpers
Handlebars.registerHelper('eq', function (a, b) {
  return a === b
})

Handlebars.registerHelper('gt', function (a, b) {
  return a > b
})

Handlebars.registerHelper('formatDate', function (date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

Handlebars.registerHelper('formatCurrency', function (amount) {
  if (!amount) return 'N/A'
  return `£${amount.toLocaleString()}`
})

Handlebars.registerHelper('formatPercentage', function (value) {
  if (value === undefined || value === null) return ''
  return `${Math.round(value * 100)}%`
})

Handlebars.registerHelper('severityColor', function (severity) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-500 text-white',
    MEDIUM: 'bg-yellow-400 text-gray-900',
    LOW: 'bg-blue-400 text-white',
    INFO: 'bg-gray-400 text-white',
  }
  return colors[severity] || 'bg-gray-400 text-white'
})

Handlebars.registerHelper('maturityColor', function (maturity) {
  const def = MATURITY_DEFINITIONS[maturity as keyof typeof MATURITY_DEFINITIONS]
  return def ? def.color : '#9CA3AF'
})

Handlebars.registerHelper('riskColor', function (risk) {
  const def = RISK_DEFINITIONS[risk as keyof typeof RISK_DEFINITIONS]
  return def ? def.color : '#9CA3AF'
})

Handlebars.registerHelper('priorityColor', function (priority) {
  const def = PRIORITY_DEFINITIONS[priority as keyof typeof PRIORITY_DEFINITIONS]
  return def ? def.color : '#9CA3AF'
})

Handlebars.registerHelper('effortColor', function (effort) {
  const def = EFFORT_DEFINITIONS[effort as keyof typeof EFFORT_DEFINITIONS]
  return def ? def.color : '#9CA3AF'
})

Handlebars.registerHelper('json', function (context) {
  return JSON.stringify(context, null, 2)
})

Handlebars.registerHelper('lookup', function (obj, field) {
  return obj && obj[field]
})

export class ReportGenerationService {
  private template: HandlebarsTemplateDelegate | null = null

  constructor() {
    this.loadTemplate()
  }

  /**
   * Load and compile Handlebars template
   */
  private loadTemplate() {
    try {
      const templatePath = join(__dirname, '../templates/report.hbs')
      const templateSource = readFileSync(templatePath, 'utf-8')
      this.template = Handlebars.compile(templateSource)
      logger.info('Report template loaded successfully')
    } catch (error: any) {
      logger.error('Failed to load report template:', error)
      throw new Error(`Failed to load report template: ${error.message}`)
    }
  }

  /**
   * Generate complete security assessment report for a project
   */
  async generateReport(projectId: string): Promise<string> {
    try {
      logger.info(`Generating report for project: ${projectId}`)

      // Fetch all project data
      const projectData = await this.fetchProjectData(projectId)

      // Generate AI assessment
      logger.info('Generating AI assessment...')
      const assessment = await reportAssessmentService.generateReportAssessment(projectData)

      // Prepare template data
      const templateData = this.prepareTemplateData(projectData, assessment)

      // Render template
      if (!this.template) {
        throw new Error('Report template not loaded')
      }

      const html = this.template(templateData)

      logger.info('Report generated successfully')
      return html
    } catch (error: any) {
      logger.error('Report generation failed:', error)
      throw new Error(`Report generation failed: ${error.message}`)
    }
  }

  /**
   * Fetch all project data from database
   */
  private async fetchProjectData(projectId: string): Promise<ProjectData> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        findings: true,
        iocs: true,
        ttpMappings: true,
        creator: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // Get the AI narrative from TTP analysis if it exists
    const aiNarrative = await this.getAINarrative(projectId)

    return {
      name: project.name,
      clientName: project.clientName,
      assessmentType: project.assessmentType,
      startDate: project.startDate,
      endDate: project.endDate || undefined,
      findings: project.findings.map((f: any) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        severity: f.severity as any,
        cvssScore: f.cvssScore || undefined,
        affectedSystems: f.affectedSystems,
        evidence: f.evidence || undefined,
        remediation: f.remediation,
        status: f.status,
      })),
      iocs: project.iocs.map((ioc: any) => ({
        id: ioc.id,
        type: ioc.type,
        value: ioc.value,
        timestamp: ioc.timestamp,
        context: ioc.context || undefined,
        source: ioc.source || undefined,
      })),
      ttps: project.ttpMappings.map((ttp: any) => ({
        id: ttp.id,
        mitreId: ttp.mitreId,
        tacticName: ttp.tacticName,
        techniqueName: ttp.techniqueName,
        description: ttp.description || undefined,
        confidence: ttp.confidence,
        aiAnalysis: ttp.aiAnalysis || undefined,
      })),
      aiNarrative,
    }
  }

  /**
   * Get AI narrative from previous TTP analysis
   */
  private async getAINarrative(projectId: string): Promise<string | undefined> {
    // The AI narrative is stored separately in the app
    // For now, we'll reconstruct it from TTP mappings
    const ttps = await prisma.tTPMapping.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (ttps.length > 0 && ttps[0].aiAnalysis) {
      return ttps[0].aiAnalysis
    }

    return undefined
  }

  /**
   * Prepare data for template rendering
   */
  private prepareTemplateData(projectData: ProjectData, assessment: any) {
    // Calculate statistics
    const stats = this.calculateStatistics(projectData)

    // Determine quick wins (HIGH priority + LOW effort)
    const quickWins = assessment.recommendations.filter(
      (r: any) => r.priority === 'HIGH' && r.effort === 'LOW'
    )

    // Generate roadmap once
    const roadmap = this.generateRoadmap(assessment.recommendations)

    return {
      // Project metadata
      project: {
        name: projectData.name,
        clientName: projectData.clientName,
        assessmentType: this.formatAssessmentType(projectData.assessmentType),
        startDate: projectData.startDate,
        endDate: projectData.endDate,
      },
      reportDate: new Date().toISOString(),
      classification: 'CONFIDENTIAL',

      // Executive Summary
      executiveSummary: {
        riskHeadline: {
          title: assessment.executiveSummary.headline,
          message: assessment.executiveSummary.overview,
        },
        riskLevel: assessment.riskAssessment.overallRisk,
        riskPosition: this.calculateRiskPosition(assessment.riskAssessment.overallRisk),
        overview: [assessment.executiveSummary.overview],
        keyFindings: assessment.executiveSummary.keyFindings,
        criticalRecommendations: assessment.executiveSummary.criticalRecommendations,
      },

      // Risk Assessment
      riskAssessment: assessment.riskAssessment,

      // Statistics
      statistics: stats,

      // Control Domains
      controlDomains: assessment.controlDomains.map((domain: any) => ({
        ...domain,
        technicalFindings: this.getLinkedFindings(domain, projectData.findings),
      })),

      // Recommendations
      recommendations: assessment.recommendations,
      quickWins,

      // Maturity Distribution
      maturityDistribution: assessment.maturityDistribution,

      // MITRE ATT&CK
      ttps: projectData.ttps.map((ttp: any) => ({
        ...ttp,
        confidencePercent: Math.round(ttp.confidence * 100),
      })),

      // IOCs
      iocs: projectData.iocs.sort(
        (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ),

      // AI Analysis Narrative
      aiNarrative: projectData.aiNarrative,

      // Roadmap
      roadmap,

      // Milestones for timeline (extracted for template ease)
      milestone1: roadmap.phases[0],
      milestone2: roadmap.phases[1],
      milestone3: roadmap.phases[2],
    }
  }

  /**
   * Calculate report statistics
   */
  private calculateStatistics(projectData: ProjectData) {
    const findings = projectData.findings

    return {
      findings: {
        total: findings.length,
        critical: findings.filter((f: any) => f.severity === 'CRITICAL').length,
        high: findings.filter((f: any) => f.severity === 'HIGH').length,
        medium: findings.filter((f: any) => f.severity === 'MEDIUM').length,
        low: findings.filter((f: any) => f.severity === 'LOW').length,
        info: findings.filter((f: any) => f.severity === 'INFO').length,
      },
      iocs: {
        total: projectData.iocs.length,
      },
      ttps: {
        total: projectData.ttps.length,
      },
    }
  }

  /**
   * Calculate risk position (0-100) for visual indicator
   */
  private calculateRiskPosition(riskLevel: string): number {
    const positions: Record<string, number> = {
      LOW: 20,
      MEDIUM: 50,
      HIGH: 80,
    }
    return positions[riskLevel] || 50
  }

  /**
   * Get findings linked to a control domain
   */
  private getLinkedFindings(domain: any, allFindings: any[]) {
    const linkedFindingIds = new Set<string>()

    // Collect all linked finding IDs from subcontrols
    domain.subControls.forEach((subControl: any) => {
      if (subControl.linkedFindings) {
        subControl.linkedFindings.forEach((id: string) => linkedFindingIds.add(id))
      }
    })

    // Return the actual finding objects
    return allFindings.filter((f) => linkedFindingIds.has(f.id))
  }

  /**
   * Generate implementation roadmap from recommendations
   */
  private generateRoadmap(recommendations: any[]) {
    // Group recommendations by priority
    const immediate = recommendations.filter((r) => r.priority === 'IMMEDIATE')
    const high = recommendations.filter((r) => r.priority === 'HIGH')
    const medium = recommendations.filter((r) => r.priority === 'MEDIUM')
    const low = recommendations.filter((r) => r.priority === 'LOW')

    // Create timeline phases
    const phases = []

    if (immediate.length > 0) {
      phases.push({
        name: 'Immediate Actions',
        timeframe: 'Month 1',
        description: 'Critical security gaps requiring immediate remediation',
        recommendations: immediate,
        duration: 1,
      })
    }

    if (high.length > 0) {
      phases.push({
        name: 'Foundation Building',
        timeframe: 'Months 1-3',
        description: 'Establish core security controls and processes',
        recommendations: high,
        duration: 3,
      })
    }

    if (medium.length > 0) {
      phases.push({
        name: 'Strategic Implementation',
        timeframe: 'Months 3-6',
        description: 'Enhance security posture with additional controls',
        recommendations: medium,
        duration: 3,
      })
    }

    if (low.length > 0) {
      phases.push({
        name: 'Optimization',
        timeframe: 'Months 6-12',
        description: 'Mature security program and optimize operations',
        recommendations: low,
        duration: 6,
      })
    }

    // Calculate totals
    const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0)
    const totalCost = recommendations.reduce((sum, rec) => {
      const oneTime = rec.costEstimate?.oneTime || 0
      const monthly = rec.costEstimate?.monthly || 0
      return sum + oneTime + monthly * 12
    }, 0)

    return {
      phases,
      totalDuration,
      totalCost,
    }
  }

  /**
   * Format assessment type for display
   */
  private formatAssessmentType(type: string): string {
    const formats: Record<string, string> = {
      PENTEST: 'Penetration Test',
      VULN_ASSESSMENT: 'Vulnerability Assessment',
      SECURITY_AUDIT: 'Security Audit',
      RED_TEAM: 'Red Team Exercise',
    }
    return formats[type] || type
  }
}

export const reportGenerationService = new ReportGenerationService()
