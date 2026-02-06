import { prisma } from '../utils/db.js'
import { logger } from '../utils/logger.js'
import { Prisma } from '@prisma/client'

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const CVE_PATTERN = /CVE-\d{4}-\d{4,}/i

interface NVDVulnerability {
  cve: {
    id: string
    descriptions: Array<{ lang: string; value: string }>
    metrics?: {
      cvssMetricV31?: Array<{
        cvssData: {
          baseScore: number
          baseSeverity: string
          vectorString: string
        }
      }>
      cvssMetricV2?: Array<{
        cvssData: {
          baseScore: number
        }
      }>
    }
    references?: Array<{ url: string; source: string }>
    published: string
    lastModified: string
  }
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

export const cveService = {
  extractCVE(text: string): string | null {
    const match = text.match(CVE_PATTERN)
    return match ? match[0].toUpperCase() : null
  },

  async lookupCVE(cveId: string): Promise<CVEData | null> {
    try {
      const apiKey = process.env.NVD_API_KEY
      const headers: Record<string, string> = { 'Accept': 'application/json' }
      if (apiKey) headers['apiKey'] = apiKey

      const response = await fetch(`${NVD_API_BASE}?cveId=${encodeURIComponent(cveId)}`, { headers })

      if (!response.ok) {
        logger.warn(`NVD API returned ${response.status} for ${cveId}`)
        return null
      }

      const data = await response.json() as { vulnerabilities?: NVDVulnerability[] }
      const vulns = data.vulnerabilities

      if (!vulns || vulns.length === 0) return null

      const vuln = vulns[0].cve
      const desc = vuln.descriptions.find((d: { lang: string }) => d.lang === 'en')?.value || ''
      const cvssV3 = vuln.metrics?.cvssMetricV31?.[0]?.cvssData
      const cvssV2 = vuln.metrics?.cvssMetricV2?.[0]?.cvssData

      return {
        cveId: vuln.id,
        description: desc,
        cvssScore: cvssV3?.baseScore || cvssV2?.baseScore,
        cvssSeverity: cvssV3?.baseSeverity,
        cvssVector: cvssV3?.vectorString,
        references: (vuln.references || []).map((r: { url: string; source: string }) => ({
          url: r.url,
          source: r.source,
        })),
        published: vuln.published,
        lastModified: vuln.lastModified,
      }
    } catch (error) {
      logger.error(`CVE lookup failed for ${cveId}:`, error)
      return null
    }
  },

  async enrichFinding(findingId: string): Promise<CVEData | null> {
    const finding = await prisma.finding.findUnique({ where: { id: findingId } })
    if (!finding) return null

    // Try to detect CVE from title, description, or existing cveId
    const cveId = finding.cveId || this.extractCVE(finding.title) || this.extractCVE(finding.description)
    if (!cveId) return null

    const cveData = await this.lookupCVE(cveId)
    if (!cveData) return null

    await prisma.finding.update({
      where: { id: findingId },
      data: {
        cveId,
        cveData: cveData as unknown as Prisma.InputJsonValue,
        cveEnrichedAt: new Date(),
        // Auto-populate CVSS if not already set
        ...(finding.cvssScore == null && cveData.cvssScore ? { cvssScore: cveData.cvssScore } : {}),
      },
    })

    return cveData
  },
}
