import { useState, useEffect } from 'react'
import { complianceService } from '../../services/complianceService'
import { FindingComplianceMapping, ComplianceFramework, ComplianceControl } from '../../types'
import { notify } from '../../store/notificationStore'

interface Props {
  findingId: string
}

export default function ComplianceMappingPanel({ findingId }: Props) {
  const [mappings, setMappings] = useState<FindingComplianceMapping[]>([])
  const [frameworks, setFrameworks] = useState<ComplianceFramework[]>([])
  const [controls, setControls] = useState<ComplianceControl[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadMappings()
    loadFrameworks()
  }, [findingId])

  useEffect(() => {
    if (selectedFramework) {
      complianceService.getControls(selectedFramework, searchTerm || undefined)
        .then(setControls)
        .catch(() => {})
    }
  }, [selectedFramework, searchTerm])

  const loadMappings = async () => {
    try {
      setLoading(true)
      const data = await complianceService.getFindingMappings(findingId)
      setMappings(data)
    } catch {
      notify.error('Failed to load compliance mappings')
    } finally {
      setLoading(false)
    }
  }

  const loadFrameworks = async () => {
    try {
      const data = await complianceService.listFrameworks()
      setFrameworks(data)
      if (data.length > 0) setSelectedFramework(data[0].id)
    } catch {
      // Ignore — non-critical
    }
  }

  const handleMap = async (controlId: string) => {
    try {
      await complianceService.mapFinding(findingId, controlId)
      notify.success('Control mapped')
      await loadMappings()
    } catch {
      notify.error('Failed to map control')
    }
  }

  const handleUnmap = async (mappingId: string) => {
    try {
      await complianceService.unmapFinding(mappingId)
      notify.success('Mapping removed')
      setMappings(prev => prev.filter(m => m.id !== mappingId))
    } catch {
      notify.error('Failed to remove mapping')
    }
  }

  const mappedControlIds = new Set(mappings.map(m => m.complianceControlId))

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Compliance Mappings</h4>
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
        >
          {showPicker ? 'Close' : '+ Add Control'}
        </button>
      </div>

      {/* Existing mappings */}
      {loading ? (
        <p className="text-xs text-gray-400">Loading...</p>
      ) : mappings.length === 0 ? (
        <p className="text-xs text-gray-400">No compliance controls mapped</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {mappings.map(m => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full"
            >
              <span className="font-medium">{m.complianceControl.framework.shortCode}</span>
              {m.complianceControl.controlId}: {m.complianceControl.title}
              <button
                onClick={() => handleUnmap(m.id)}
                className="ml-1 text-indigo-400 hover:text-red-500"
                title="Remove mapping"
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Control Picker */}
      {showPicker && (
        <div className="border rounded-lg p-3 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1"
            >
              {frameworks.map(fw => (
                <option key={fw.id} value={fw.id}>{fw.name} {fw.version}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search controls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 flex-1"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {controls.length === 0 ? (
              <p className="text-xs text-gray-400 py-2 text-center">No controls found</p>
            ) : controls.map(control => (
              <div
                key={control.id}
                className={`flex items-center justify-between text-xs p-2 rounded ${
                  mappedControlIds.has(control.id) ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-gray-200'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{control.controlId}</span>{' '}
                  <span className="text-gray-600">{control.title}</span>
                </div>
                {mappedControlIds.has(control.id) ? (
                  <span className="text-indigo-500 text-xs ml-2 flex-shrink-0">Mapped</span>
                ) : (
                  <button
                    onClick={() => handleMap(control.id)}
                    className="ml-2 px-2 py-0.5 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 flex-shrink-0"
                  >
                    Map
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
