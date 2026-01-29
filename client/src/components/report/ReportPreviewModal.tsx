import { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Project } from '../../types'
import reportService from '../../services/reportService'

interface ReportPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    project: Project
}

export default function ReportPreviewModal({
    isOpen,
    onClose,
    project,
}: ReportPreviewModalProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [reportHtml, setReportHtml] = useState<string>('')
    const iframeRef = useRef<HTMLIFrameElement>(null)

    useEffect(() => {
        if (isOpen && project.id) {
            loadReport()
        }
    }, [isOpen, project.id])

    const loadReport = async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await reportService.generateReport(project.id)
            setReportHtml(response.html)
        } catch (err: any) {
            console.error('Failed to generate report:', err)
            setError('Failed to generate report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.print()
        }
    }

    if (!isOpen) return null

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Report Preview" maxWidth="4xl">
            <div className="flex justify-between items-center mb-4 no-print">
                <div className="text-sm text-gray-500">
                    {loading ? 'Generating fresh analysis...' : 'Preview generated from live data'}
                </div>
                <div className="flex gap-2">
                    <Button onClick={handlePrint} disabled={loading || !reportHtml}>
                        Print / Save as PDF
                    </Button>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                </div>
            </div>

            <div className="bg-white border rounded h-[80vh] overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                        <p className="text-gray-600 font-medium">Generating Report & AI Analysis...</p>
                        <p className="text-gray-400 text-sm mt-2">This may take 15-30 seconds</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 p-8 text-center">
                        <p className="text-lg font-semibold mb-2">Error Generating Report</p>
                        <p>{error}</p>
                        <Button onClick={loadReport} className="mt-4">Try Again</Button>
                    </div>
                )}

                {reportHtml && (
                    <iframe
                        ref={iframeRef}
                        srcDoc={reportHtml}
                        className="w-full h-full border-none"
                        title="Report Preview"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                    />
                )}
            </div>
        </Modal>
    )
}
