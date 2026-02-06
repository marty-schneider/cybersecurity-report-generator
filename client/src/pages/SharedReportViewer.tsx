import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { shareService } from '../services/shareService'

export default function SharedReportViewer() {
  const { token } = useParams<{ token: string }>()
  const [html, setHtml] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsPassword, setNeedsPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    if (token) loadReport()
  }, [token])

  const loadReport = async () => {
    try {
      setLoading(true)
      const data = await shareService.viewShared(token!)
      setHtml(data.html)
      setProjectName(data.projectName)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Password required') || message.includes('401')) {
        setNeedsPassword(true)
      } else {
        setError(message || 'Failed to load report')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    try {
      setVerifying(true)
      setError('')
      const data = await shareService.verifyAndView(token!, password)
      setHtml(data.html)
      setProjectName(data.projectName)
      setNeedsPassword(false)
    } catch {
      setError('Incorrect password')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (needsPassword && !html) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Protected Report</h1>
          <p className="text-sm text-gray-600 mb-4">This report requires a password to view.</p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="Enter password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3"
            autoFocus
          />
          <button
            onClick={handleVerify}
            disabled={verifying || !password}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'View Report'}
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Unable to Load Report</h1>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-900">{projectName}</span>
          <span className="text-xs text-gray-500 ml-2">Shared Report</span>
        </div>
        <button
          onClick={() => window.print()}
          className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
        >
          Print / Save PDF
        </button>
      </div>
      <div
        className="max-w-5xl mx-auto my-8 bg-white shadow-lg"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
