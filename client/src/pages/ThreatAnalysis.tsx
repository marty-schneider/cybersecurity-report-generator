import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { iocService } from '../services/iocService'
import { ttpService } from '../services/ttpService'
import { useIOCStore } from '../store/iocStore'
import Button from '../components/common/Button'
import LoadingSkeleton from '../components/LoadingSkeleton'
import IOCImportModal from '../components/ioc/IOCImportModal'
import IOCFormModal from '../components/ioc/IOCFormModal'
import IOCList from '../components/ioc/IOCList'
import { ConfidenceBadge } from '../components/badges'
import { useIOCForm } from '../hooks/useIOCForm'
import { notify } from '../store/notificationStore'

export default function ThreatAnalysis() {
  const { id: projectId } = useParams<{ id: string }>()
  const { iocs, setIOCs, ttps, setTTPs, isAnalyzing, setAnalyzing } = useIOCStore()
  const [loading, setLoading] = useState(true)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const iocForm = useIOCForm({
    projectId,
    iocs,
    setIOCs,
    onError: (msg) => notify.error(msg),
  })

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const [iocsData, ttpsData] = await Promise.all([
        iocService.getByProject(projectId),
        ttpService.getByProject(projectId),
      ])
      setIOCs(iocsData)
      setTTPs(ttpsData)
    } catch {
      notify.error('Failed to load threat analysis data')
      setIOCs([])
      setTTPs([])
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!projectId) return
    try {
      setAnalyzing(true)
      const result = await ttpService.analyze(projectId)
      setAnalysisResult(result.analysis)
      setTTPs(result.ttpMappings)
    } catch {
      notify.error('Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Threat Analysis</h1>
        <LoadingSkeleton type="table" count={5} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Threat Analysis</h1>
        <div className="flex gap-3">
          <Button onClick={iocForm.handleAddNew}>+ Add IOC</Button>
          <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
            📄 Import from File
          </Button>
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

          {analysisResult.recommendations?.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations</h3>
              <ul className="list-disc list-inside space-y-2">
                {analysisResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-gray-700">{rec}</li>
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
                  <ConfidenceBadge confidence={ttp.confidence} />
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

      {/* IOC List */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Indicators of Compromise ({iocs.length})
        </h2>
        {iocs.length === 0 ? (
          <p className="text-gray-600">
            No IOCs yet. Add indicators of compromise to enable AI-powered threat analysis.
          </p>
        ) : (
          <IOCList iocs={iocs} onEdit={iocForm.handleEdit} onDelete={iocForm.handleDelete} />
        )}
      </div>

      <IOCFormModal
        isOpen={iocForm.isModalOpen}
        onClose={iocForm.closeModal}
        onSubmit={iocForm.handleSubmit}
        editingIOC={iocForm.editingIOC}
        formData={iocForm.formData}
        setFormData={iocForm.setFormData}
      />

      <IOCImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={projectId || ''}
        onImportComplete={loadData}
      />
    </div>
  )
}
