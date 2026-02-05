import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import DOMPurify from 'dompurify'
import reportService from '../services/reportService'
import Button from '../components/common/Button'
import { notify } from '../store/notificationStore'

export default function ReportViewer() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportHtml, setReportHtml] = useState<string | null>(null)

  useEffect(() => {
    if (projectId) generateReport()
  }, [projectId])

  const generateReport = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const response = await reportService.generateReport(projectId)
      setReportHtml(response.html)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate report. Please try again.'
      setError(message)
      notify.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    navigate(`/projects/${projectId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Generating Report</h2>
          <p className="text-gray-600">
            This may take 30-60 seconds as we analyze your data with AI...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Report Generation Failed</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={generateReport} variant="primary">Try Again</Button>
              <Button onClick={handleBack} variant="secondary">Back to Project</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!reportHtml) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No report data available.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button onClick={handleBack} className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M15 19l-7-7 7-7"></path>
                </svg>
                Back to Project
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900">Security Assessment Report</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handlePrint} variant="primary">Print / Save as PDF</Button>
              <Button onClick={generateReport} variant="secondary">Regenerate</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="report-container">
        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportHtml) }} />
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .report-container, .report-container * { visibility: visible; }
          .report-container { position: absolute; left: 0; top: 0; width: 100%; }
          @page { size: A4; margin: 20mm; }
          h1, h2, h3, h4, h5, h6 { page-break-after: avoid; page-break-inside: avoid; }
          table, figure, .card { page-break-inside: avoid; }
          .page-break { page-break-after: always; }
          nav, .no-print { display: none !important; }
        }
        .report-container { max-width: 1200px; margin: 0 auto; background: white; min-height: 100vh; }
      `}</style>
    </div>
  )
}
