import { prisma } from '../utils/db.js'

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsv).join(',')
}

export const csvExportService = {
  async exportFindings(projectId: string): Promise<string> {
    const findings = await prisma.finding.findMany({
      where: { projectId },
      orderBy: [{ severity: 'asc' }, { title: 'asc' }],
    })

    const header = toCsvRow([
      'ID', 'Title', 'Severity', 'Status', 'CVSS Score', 'CVE ID',
      'Affected Systems', 'Description', 'Remediation', 'Created At',
    ])

    const rows = findings.map(f => toCsvRow([
      f.id,
      f.title,
      f.severity,
      f.status,
      f.cvssScore,
      f.cveId,
      f.affectedSystems.join('; '),
      f.description,
      f.remediation,
      f.createdAt.toISOString(),
    ]))

    return [header, ...rows].join('\n')
  },

  async exportIOCs(projectId: string): Promise<string> {
    const iocs = await prisma.iOC.findMany({
      where: { projectId },
      orderBy: [{ type: 'asc' }, { timestamp: 'desc' }],
    })

    const header = toCsvRow([
      'ID', 'Type', 'Value', 'Timestamp', 'Context', 'Source', 'Created At',
    ])

    const rows = iocs.map(ioc => toCsvRow([
      ioc.id,
      ioc.type,
      ioc.value,
      ioc.timestamp.toISOString(),
      ioc.context,
      ioc.source,
      ioc.createdAt.toISOString(),
    ]))

    return [header, ...rows].join('\n')
  },
}
