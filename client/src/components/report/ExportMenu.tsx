import { useState } from 'react'
import { exportService } from '../../services/exportService'
import { notify } from '../../store/notificationStore'

interface Props {
  projectId: string
}

const EXPORT_OPTIONS = [
  { key: 'csv-findings', label: 'CSV (Findings)', icon: '📊' },
  { key: 'csv-iocs', label: 'CSV (IOCs)', icon: '📊' },
  { key: 'json', label: 'JSON (Full Export)', icon: '📦' },
  { key: 'html', label: 'HTML Report', icon: '🌐' },
  { key: 'docx', label: 'DOCX Report', icon: '📝' },
] as const

export default function ExportMenu({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  const handleExport = async (key: string) => {
    try {
      setLoadingKey(key)
      switch (key) {
        case 'csv-findings':
          await exportService.exportCSV(projectId, 'findings')
          break
        case 'csv-iocs':
          await exportService.exportCSV(projectId, 'iocs')
          break
        case 'json':
          await exportService.exportJSON(projectId)
          break
        case 'html':
          await exportService.exportHTML(projectId)
          break
        case 'docx':
          await exportService.exportDOCX(projectId)
          break
      }
      notify.success('Export downloaded')
    } catch {
      notify.error('Export failed')
    } finally {
      setLoadingKey(null)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
      >
        Export Data
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {EXPORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => handleExport(opt.key)}
                disabled={loadingKey !== null}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
                {loadingKey === opt.key && (
                  <span className="ml-auto animate-spin text-xs">...</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
