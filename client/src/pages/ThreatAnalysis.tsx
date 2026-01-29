import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { iocService } from '../services/iocService'
import { ttpService } from '../services/ttpService'
import { useIOCStore } from '../store/iocStore'
import { IOC, IOCType, TTPMapping } from '../types'
import Modal from '../components/common/Modal'
import Button from '../components/common/Button'
import IOCImportModal from '../components/ioc/IOCImportModal'

export default function ThreatAnalysis() {
  const { id: projectId } = useParams<{ id: string }>()
  const { iocs, setIOCs, ttps, setTTPs, isAnalyzing, setAnalyzing } = useIOCStore()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const [formData, setFormData] = useState({
    type: 'IP_ADDRESS' as IOCType,
    value: '',
    timestamp: new Date().toISOString().slice(0, 16),
    context: '',
    source: '',
  })
  // ... (rest of the file content)
  const handleImportComplete = () => {
    loadData()
  }

  // ... (rest of the file content)

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Threat Analysis</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}>Import from File</Button>
          <Button onClick={() => setIsModalOpen(true)}>+ Add IOC</Button>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || iocs.length === 0}
            variant={iocs.length === 0 ? 'secondary' : 'primary'}
          >
            {isAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
          </Button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysisResult && (
        <div className="mb-8 space-y-4">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Analysis</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.narrative}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Timeline</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.timeline}</p>
          </div>

          {analysisResult.threatActorProfile && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Threat Actor Profile</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{analysisResult.threatActorProfile}</p>
            </div>
          )}

          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
              <ul className="list-disc list-inside space-y-2">
                {analysisResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-gray-700">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TTPs */}
      {ttps.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            MITRE ATT&CK Techniques ({ttps.length})
          </h2>
          <div className="space-y-3">
            {ttps.map((ttp) => (
              <div key={ttp.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-mono text-sm text-primary-600">{ttp.mitreId}</span>
                    <h4 className="font-semibold text-gray-900">{ttp.techniqueName}</h4>
                    <p className="text-sm text-gray-600">{ttp.tacticName}</p>
                  </div>
                  <span className={`text-sm font-medium ${getSeverityColor(ttp.confidence)}`}>
                    {Math.round(ttp.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{ttp.description}</p>
                {ttp.aiAnalysis && (
                  <p className="text-xs text-gray-600 italic">{ttp.aiAnalysis}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* IOC Timeline */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Indicators of Compromise ({iocs.length})
        </h2>

        {iocs.length === 0 ? (
          <p className="text-gray-600">
            No IOCs yet. Add indicators of compromise to enable AI-powered threat analysis.
          </p>
        ) : (
          <div className="space-y-3">
            {iocs.map((ioc) => (
              <div key={ioc.id} className="border-l-4 border-primary-500 pl-4 py-2">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {getIOCTypeBadge(ioc.type)}
                    <span className="font-mono text-sm text-gray-900">{ioc.value}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(ioc.timestamp).toLocaleString()}
                  </span>
                </div>
                {ioc.context && <p className="text-sm text-gray-600 mt-1">{ioc.context}</p>}
                {ioc.source && <p className="text-xs text-gray-500 mt-1">Source: {ioc.source}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add IOC Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Indicator of Compromise">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">IOC Type</label>
            <select
              className="input"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as IOCType })}
            >
              <option value="IP_ADDRESS">IP Address</option>
              <option value="DOMAIN">Domain</option>
              <option value="URL">URL</option>
              <option value="FILE_HASH_MD5">File Hash (MD5)</option>
              <option value="FILE_HASH_SHA1">File Hash (SHA1)</option>
              <option value="FILE_HASH_SHA256">File Hash (SHA256)</option>
              <option value="EMAIL">Email</option>
              <option value="CVE">CVE</option>
              <option value="REGISTRY_KEY">Registry Key</option>
              <option value="MUTEX">Mutex</option>
              <option value="USER_AGENT">User Agent</option>
              <option value="CERTIFICATE">Certificate</option>
              <option value="FILE_PATH">File Path</option>
              <option value="COMMAND_LINE">Command Line</option>
            </select>
          </div>

          <div>
            <label className="label">Value</label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g., 192.168.1.100, malicious.com"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Timestamp</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Context (Optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Additional context about this IOC..."
              value={formData.context}
              onChange={(e) => setFormData({ ...formData, context: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Source (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., firewall logs, EDR alert"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              Add IOC
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <IOCImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={projectId!}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
