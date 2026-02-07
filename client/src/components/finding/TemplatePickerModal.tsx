import { useEffect, useState } from 'react'
import { findingTemplateService } from '../../services/findingTemplateService'
import { FindingTemplate, Severity } from '../../types'
import { SeverityBadge } from '../badges'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { notify } from '../../store/notificationStore'

interface TemplatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (template: FindingTemplate) => void
}

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

export default function TemplatePickerModal({ isOpen, onClose, onSelect }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<FindingTemplate[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState<Severity | ''>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const fetch = async () => {
      try {
        setLoading(true)
        const [tmpl, cats] = await Promise.all([
          findingTemplateService.list({
            search: search || undefined,
            category: categoryFilter || undefined,
            severity: severityFilter || undefined,
          }),
          findingTemplateService.getCategories(),
        ])
        setTemplates(tmpl)
        setCategories(cats)
      } catch {
        notify.error('Failed to load templates')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [isOpen, search, categoryFilter, severityFilter])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Finding Templates">
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            className="input py-1 text-sm flex-1 min-w-[200px]"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input py-1 text-sm w-auto"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="input py-1 text-sm w-auto"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as Severity | '')}
          >
            <option value="">All Severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Template List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No templates found.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={template.severity} />
                    <span className="font-medium text-gray-900 text-sm">{template.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{template.category}</span>
                </div>
                {expandedId === template.id && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-700">{template.description}</p>
                    {template.cvssScore && (
                      <p className="text-xs text-gray-500">CVSS: {template.cvssScore}</p>
                    )}
                    <p className="text-sm text-gray-600"><span className="font-medium">Remediation:</span> {template.remediation}</p>
                    {template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(template)
                        onClose()
                      }}
                      className="mt-2"
                    >
                      Use This Template
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
