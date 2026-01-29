import ReactMarkdown from 'react-markdown'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Project, Finding, IOC, TTPMapping } from '../../types'

interface ReportPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    project: Project
    findings: Finding[]
    iocs: IOC[]
    ttps: TTPMapping[]
}

export default function ReportPreviewModal({
    isOpen,
    onClose,
    project,
    findings,
    iocs,
    ttps
}: ReportPreviewModalProps) {

    const generateMarkdown = () => {
        const date = new Date().toLocaleDateString()

        let md = `# Cybersecurity Assessment Report\n\n`
        md += `**Project:** ${project.name}\n`
        md += `**Client:** ${project.clientName}\n`
        md += `**Date:** ${date}\n`
        md += `**Assessment Type:** ${project.assessmentType}\n\n`

        md += `## Executive Summary\n`
        md += `This report details the findings and analysis from the ${project.assessmentType} conducted for ${project.clientName}. `
        md += `A total of **${findings.length} findings** and **${ttps.length} MITRE ATT&CK techniques** were identified.\n\n`

        if (findings.length > 0) {
            md += `## Security Findings\n\n`
            findings.forEach((f, idx) => {
                md += `### ${idx + 1}. ${f.title}\n`
                md += `**Severity:** ${f.severity} | **Status:** ${f.status}\n\n`
                md += `**Description:**\n${f.description}\n\n`
                if (f.remediation) {
                    md += `**Remediation:**\n${f.remediation}\n\n`
                }
                md += `---\n\n`
            })
        }

        if (ttps.length > 0) {
            md += `## Threat Analysis (MITRE ATT&CK)\n\n`
            md += `Based on the analysis of **${iocs.length} Indicators of Compromise**, the following techniques were observed:\n\n`

            // Group by Tactic? For now just list them
            ttps.forEach(ttp => {
                md += `### ${ttp.mitreId}: ${ttp.techniqueName}\n`
                md += `**Tactic:** ${ttp.tacticName} | **Confidence:** ${Math.round(ttp.confidence * 100)}%\n\n`
                md += `${ttp.description}\n\n`
            })
        }

        if (iocs.length > 0) {
            md += `## Appendix: Indicators of Compromise\n\n`
            md += `| Type | Value | Source |\n`
            md += `|------|-------|--------|\n`
            iocs.slice(0, 50).forEach(ioc => {
                md += `| ${ioc.type} | ${ioc.value} | ${ioc.source || '-'} |\n`
            })
            if (iocs.length > 50) {
                md += `\n*(Showing first 50 of ${iocs.length} IOCs)*\n`
            }
        }

        return md
    }

    const handlePrint = () => {
        window.print()
    }

    const reportContent = generateMarkdown()

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report Preview" maxWidth="4xl">
            <div className="flex justify-end gap-2 mb-4 no-print">
                <Button onClick={handlePrint}>Print / Save as PDF</Button>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </div>

            <div className="prose max-w-none p-8 bg-white border rounded print:border-none print:p-0">
                <ReactMarkdown>{reportContent}</ReactMarkdown>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .modal-overlay { position: static; background: none; }
                    .modal-content { box-shadow: none; width: 100%; max-width: 100%; }
                    body > *:not(.modal-root) { display: none; }
                }
            `}</style>
        </Modal>
    )
}
