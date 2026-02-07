import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  Packer,
} from 'docx'
import { prisma } from '../utils/db.js'

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

export const docxExportService = {
  async exportReport(projectId: string): Promise<Buffer> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        findings: { orderBy: { severity: 'asc' } },
        iocs: { orderBy: { timestamp: 'desc' } },
        ttpMappings: true,
        creator: { select: { name: true } },
      },
    })

    if (!project) throw new Error('Project not found')

    const sections: Paragraph[] = []

    // Title
    sections.push(
      new Paragraph({
        text: `Security Assessment Report: ${project.name}`,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Client: ${project.clientName}`, bold: true }),
        ],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Assessment Type: ${project.assessmentType.replace(/_/g, ' ')} | Date: ${project.startDate.toISOString().split('T')[0]}`,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    )

    // Executive Summary
    sections.push(
      new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
    )

    const severityCounts: Record<string, number> = {}
    for (const f of project.findings) {
      severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1
    }

    sections.push(
      new Paragraph({
        children: [
          new TextRun(`This report presents the results of the security assessment conducted for ${project.clientName}. `),
          new TextRun(`A total of ${project.findings.length} findings were identified across the assessment scope. `),
          new TextRun(`${project.iocs.length} indicators of compromise (IOCs) were analyzed.`),
        ],
      }),
    )

    // Severity summary
    for (const sev of SEVERITY_ORDER) {
      if (severityCounts[sev]) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${sev}: `, bold: true }),
              new TextRun(`${severityCounts[sev]} finding(s)`),
            ],
            bullet: { level: 0 },
          }),
        )
      }
    }

    // Findings Detail
    sections.push(
      new Paragraph({ text: 'Findings', heading: HeadingLevel.HEADING_1, spacing: { before: 400 } }),
    )

    // Findings table
    if (project.findings.length > 0) {
      const headerRow = new TableRow({
        children: ['#', 'Title', 'Severity', 'Status', 'CVSS'].map(text =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
            width: { size: text === 'Title' ? 4000 : 1500, type: WidthType.DXA },
          })
        ),
        tableHeader: true,
      })

      const dataRows = project.findings.map((f, idx) =>
        new TableRow({
          children: [
            String(idx + 1),
            f.title,
            f.severity,
            f.status.replace(/_/g, ' '),
            f.cvssScore?.toFixed(1) || 'N/A',
          ].map(text =>
            new TableCell({
              children: [new Paragraph({ text })],
            })
          ),
        })
      )

      sections.push(
        new Paragraph({ text: '' }),
      )

      const findingsTable = new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      })

      // Detailed findings
      for (const finding of project.findings) {
        sections.push(
          new Paragraph({
            text: `${finding.title} [${finding.severity}]`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Description: ', bold: true }), new TextRun(finding.description)],
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Remediation: ', bold: true }), new TextRun(finding.remediation)],
          }),
        )
        if (finding.affectedSystems.length > 0) {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: 'Affected Systems: ', bold: true }), new TextRun(finding.affectedSystems.join(', '))],
            }),
          )
        }
        if (finding.cveId) {
          sections.push(
            new Paragraph({
              children: [new TextRun({ text: 'CVE: ', bold: true }), new TextRun(finding.cveId)],
            }),
          )
        }
      }

      const doc = new Document({
        sections: [{
          children: [...sections, findingsTable],
        }],
      })

      const buffer = await Packer.toBuffer(doc)
      return Buffer.from(buffer)
    }

    const doc = new Document({
      sections: [{ children: sections }],
    })

    const buffer = await Packer.toBuffer(doc)
    return Buffer.from(buffer)
  },
}
