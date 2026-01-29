import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectService } from '../services/projectService'
import { findingService } from '../services/findingService'
import { iocService } from '../services/iocService'
import { ttpService } from '../services/ttpService'
import { useProjectStore } from '../store/projectStore'
import { Project, Finding, Severity, IOC, IOCType } from '../types'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import IOCImportModal from '../components/ioc/IOCImportModal'
import ReportPreviewModal from '../components/report/ReportPreviewModal'
import { getSeverityBadgeClass, getStatusBadgeClass, getIOCTypeBadgeClass, getSeverityColor } from '../constants/badgeColors'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()
  const [findings, setFindings] = useState<Finding[]>([])
  const [iocs, setIOCs] = useState<IOC[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)
  const [isIOCModalOpen, setIsIOCModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [editingIOC, setEditingIOC] = useState<IOC | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as Severity,
    cvssScore: '',
    affectedSystems: '',
    evidence: '',
    remediation: '',
  })
  const [iocFormData, setIOCFormData] = useState({
    type: 'IP_ADDRESS' as IOCType,
    value: '',
    timestamp: new Date().toISOString().slice(0, 16),
    context: '',
    source: '',
  })

  useEffect(() => {
    if (id) {
      loadProject()
    }
  }, [id])

  const loadProject = async () => {
    if (!id) return

    try {
      setLoading(true)
      const [projectData, findingsData, iocsData] = await Promise.all([
        projectService.getById(id),
        findingService.getByProject(id),
        iocService.getByProject(id),
      ])
      setCurrentProject(projectData as any)
      setFindings(findingsData)
      setIOCs(iocsData)
    } catch (error: any) {
      console.error('Failed to load project:', error)
      console.error('Error details:', error.response?.data || error.message)
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitFinding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      const findingData = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        cvssScore: formData.cvssScore ? parseFloat(formData.cvssScore) : undefined,
        affectedSystems: formData.affectedSystems.split(',').map((s) => s.trim()).filter(Boolean),
        evidence: formData.evidence || undefined,
        remediation: formData.remediation,
      }

      if (editingFinding) {
        // Update existing finding
        const updatedFinding = await findingService.update(editingFinding.id, findingData)
        setFindings(findings.map(f => f.id === editingFinding.id ? updatedFinding : f))
      } else {
        // Create new finding
        const newFinding = await findingService.create({
          projectId: id,
          ...findingData,
        })
        setFindings([newFinding, ...findings])
      }

      setIsModalOpen(false)
      setEditingFinding(null)
      setFormData({
        title: '',
        description: '',
        severity: 'MEDIUM',
        cvssScore: '',
        affectedSystems: '',
        evidence: '',
        remediation: '',
      })
    } catch (error: any) {
      console.error(`Failed to ${editingFinding ? 'update' : 'create'} finding:`, error)
      console.error('Error details:', error.response?.data || error.message)
      alert(error.response?.data?.message || `Failed to ${editingFinding ? 'update' : 'create'} finding`)
    }
  }

  const handleEditFinding = (finding: Finding) => {
    setEditingFinding(finding)
    setFormData({
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      cvssScore: finding.cvssScore?.toString() || '',
      affectedSystems: finding.affectedSystems.join(', '),
      evidence: finding.evidence || '',
      remediation: finding.remediation,
    })
    setIsModalOpen(true)
  }

  const handleDeleteFinding = async (finding: Finding) => {
    if (!confirm(`Are you sure you want to delete the finding "${finding.title}"?`)) return

    try {
      await findingService.delete(finding.id)
      setFindings(findings.filter(f => f.id !== finding.id))
    } catch (error: any) {
      console.error('Failed to delete finding:', error)
      alert(error.response?.data?.message || 'Failed to delete finding')
    }
  }

  const handleAddNewFinding = () => {
    setEditingFinding(null)
    setFormData({
      title: '',
      description: '',
      severity: 'MEDIUM',
      cvssScore: '',
      affectedSystems: '',
      evidence: '',
      remediation: '',
    })
    setIsModalOpen(true)
  }

  // IOC Handlers
  const handleSubmitIOC = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return

    try {
      if (editingIOC) {
        const updatedIOC = await iocService.update(editingIOC.id, iocFormData)
        setIOCs(iocs.map(ioc => ioc.id === editingIOC.id ? updatedIOC : ioc))
      } else {
        const newIOC = await iocService.create({
          projectId: id,
          ...iocFormData,
        })
        setIOCs([...iocs, newIOC])
      }
      setIsIOCModalOpen(false)
      setEditingIOC(null)
      setIOCFormData({
        type: 'IP_ADDRESS',
        value: '',
        timestamp: new Date().toISOString().slice(0, 16),
        context: '',
        source: '',
      })
    } catch (error: any) {
      console.error(`Failed to ${editingIOC ? 'update' : 'create'} IOC:`, error)
      alert(error.response?.data?.message || `Failed to ${editingIOC ? 'update' : 'create'} IOC`)
    }
  }

  const handleEditIOC = (ioc: IOC) => {
    setEditingIOC(ioc)
    setIOCFormData({
      type: ioc.type,
      value: ioc.value,
      timestamp: new Date(ioc.timestamp).toISOString().slice(0, 16),
      context: ioc.context || '',
      source: ioc.source || '',
    })
    setIsIOCModalOpen(true)
  }

  const handleDeleteIOC = async (ioc: IOC) => {
    if (!confirm(`Are you sure you want to delete this IOC: ${ioc.value}?`)) return

    try {
      await iocService.delete(ioc.id)
      setIOCs(iocs.filter(i => i.id !== ioc.id))
    } catch (error: any) {
      console.error('Failed to delete IOC:', error)
      alert(error.response?.data?.message || 'Failed to delete IOC')
    }
  }

  const handleAddNewIOC = () => {
    setEditingIOC(null)
    setIOCFormData({
      type: 'IP_ADDRESS',
      value: '',
      timestamp: new Date().toISOString().slice(0, 16),
      context: '',
      source: '',
    })
    setIsIOCModalOpen(true)
  }

  const handleAnalyzeIOCs = async () => {
    if (!id) return

    try {
      setIsAnalyzing(true)
      await ttpService.analyze(id)
      alert('AI analysis complete! View full results in Threat Analysis page.')
      // Optionally refresh to show updated analysis
    } catch (error: any) {
      alert(error.response?.data?.message || 'Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSeverityBadge = (severity: Severity) => (
    <span className={`px-3 py-1 rounded text-sm font-medium ${getSeverityBadgeClass(severity)}`}>
      {severity}
    </span>
  )

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(status)}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )

  const getIOCTypeBadge = (type: IOCType) => (
    <span className={`px-2 py-1 rounded text-xs font-medium ${getIOCTypeBadgeClass(type)}`}>
      {type.replace(/_/g, ' ')}
    </span>
  )

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Project Details</h1>
        <LoadingSkeleton type="full" />
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Project Not Found</h1>
        <div className="card">
          <p className="text-gray-600">The project you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  const isIncidentResponse = currentProject.assessmentType === 'INCIDENT_RESPONSE'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
            <p className="text-gray-600">Client: {currentProject.clientName}</p>
            {isIncidentResponse && (
              <p className="text-sm text-orange-600 mt-1">🚨 Incident Response Investigation</p>
            )}
          </div>
          <div className="flex gap-3">
            <Link to={`/projects/${id}/threat-analysis`}>
              <Button>🔍 Threat Analysis</Button>
            </Link>
            <Button onClick={() => setIsReportModalOpen(true)} variant="primary">📄 Generate Report</Button>
            <Button variant="secondary">⚙️ Settings</Button>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className={`grid grid-cols-1 gap-4 ${isIncidentResponse ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Assessment Type</p>
            <p className="text-lg font-semibold text-gray-900">
              {currentProject.assessmentType.replace(/_/g, ' ')}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Status</p>
            <p className="text-lg font-semibold text-gray-900">{currentProject.status}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">{isIncidentResponse ? 'Incident Date' : 'Start Date'}</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(currentProject.startDate).toLocaleDateString()}
            </p>
          </div>
          {!isIncidentResponse && (
            <div className="card">
              <p className="text-sm text-gray-600 mb-1">Findings</p>
              <p className="text-lg font-semibold text-gray-900">{findings.length}</p>
            </div>
          )}
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">IOCs</p>
            <p className="text-lg font-semibold text-gray-900">{iocs.length}</p>
          </div>
        </div>
      </div>

      {/* IOC Section - Show first for Incident Response */}
      {isIncidentResponse && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Incident Timeline & Indicators</h2>
              <p className="text-sm text-gray-600 mt-1">Document evidence and indicators from the incident</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddNewIOC} variant="primary">+ Add IOC</Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                📄 Import from File
              </Button>
              {iocs.length > 0 && (
                <Button
                  onClick={handleAnalyzeIOCs}
                  disabled={isAnalyzing}
                  variant="primary"
                >
                  {isAnalyzing ? 'Analyzing...' : '🤖 Analyze Incident'}
                </Button>
              )}
            </div>
          </div>

          {iocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No indicators documented yet. Start by adding IOCs from the incident.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleAddNewIOC} variant="primary">+ Add First IOC</Button>
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                  📄 Import from File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {iocs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()).map((ioc) => (
                <div key={ioc.id} className="border-l-4 border-orange-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-semibold text-orange-600 min-w-[140px]">
                        {new Date(ioc.timestamp).toLocaleString()}
                      </span>
                      {getIOCTypeBadge(ioc.type)}
                      <span className="font-mono text-sm text-gray-900">{ioc.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditIOC(ioc)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                        title="Edit IOC"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteIOC(ioc)}
                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                        title="Delete IOC"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {ioc.context && <p className="text-sm text-gray-600 mt-1 ml-[140px]">{ioc.context}</p>}
                  {ioc.source && <p className="text-xs text-gray-500 mt-1 ml-[140px]">Source: {ioc.source}</p>}
                </div>
              ))}
            </div>
          )}

          {iocs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link to={`/projects/${id}/threat-analysis`}>
                <Button variant="secondary" className="w-full">
                  🔍 View Detailed Incident Analysis & Attack Chain →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Findings Section - Only show for non-IR projects */}
      {!isIncidentResponse && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Findings</h2>
            <Button onClick={handleAddNewFinding}>+ Add Finding</Button>
          </div>

          {findings.length === 0 ? (
            <p className="text-gray-600">No findings yet. Add your first security finding to get started.</p>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => (
                <div key={finding.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {getSeverityBadge(finding.severity)}
                      <h3 className="font-semibold text-gray-900">{finding.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {finding.cvssScore && (
                        <span className="text-sm text-gray-600">CVSS: {finding.cvssScore}</span>
                      )}
                      {getStatusBadge(finding.status)}
                      <button
                        onClick={() => handleEditFinding(finding)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                        title="Edit Finding"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteFinding(finding)}
                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                        title="Delete Finding"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{finding.description}</p>
                  {finding.affectedSystems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {finding.affectedSystems.map((system, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {system}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IOC Section - For non-IR projects, show after Findings */}
      {!isIncidentResponse && (
        <div className="card mt-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Indicators of Compromise</h2>
              <p className="text-sm text-gray-600 mt-1">Add IOCs to enable AI-powered threat analysis</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleAddNewIOC} variant="secondary">+ Add IOC</Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                📄 Import from File
              </Button>
              {iocs.length > 0 && (
                <Button
                  onClick={handleAnalyzeIOCs}
                  disabled={isAnalyzing}
                  variant="primary"
                >
                  {isAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
                </Button>
              )}
            </div>
          </div>

          {iocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No IOCs yet. Add indicators to enable AI-powered threat analysis.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleAddNewIOC} variant="primary">+ Add Your First IOC</Button>
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">
                  📄 Import from File
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {iocs.map((ioc) => (
                <div key={ioc.id} className="border-l-4 border-primary-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      {getIOCTypeBadge(ioc.type)}
                      <span className="font-mono text-sm text-gray-900">{ioc.value}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {new Date(ioc.timestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleEditIOC(ioc)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                        title="Edit IOC"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteIOC(ioc)}
                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                        title="Delete IOC"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {ioc.context && <p className="text-sm text-gray-600 mt-1">{ioc.context}</p>}
                  {ioc.source && <p className="text-xs text-gray-500 mt-1">Source: {ioc.source}</p>}
                </div>
              ))}
            </div>
          )}

          {iocs.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <Link to={`/projects/${id}/threat-analysis`}>
                <Button variant="secondary" className="w-full">
                  🔍 View Full Threat Analysis & Results →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Finding Modal - Only for non-IR projects */}
      {!isIncidentResponse && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingFinding(null)
          }}
          title={editingFinding ? "Edit Security Finding" : "Add Security Finding"}
        >
          <form onSubmit={handleSubmitFinding} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g., SQL Injection in Login Form"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Severity</label>
              <select
                className="input"
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Informational</option>
              </select>
            </div>

            <div>
              <label className="label">CVSS Score (Optional)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                className="input"
                placeholder="e.g., 7.5"
                value={formData.cvssScore}
                onChange={(e) => setFormData({ ...formData, cvssScore: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                required
                className="input"
                rows={4}
                placeholder="Detailed description of the vulnerability..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Affected Systems (comma-separated)</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., web-server-01, api.example.com"
                value={formData.affectedSystems}
                onChange={(e) => setFormData({ ...formData, affectedSystems: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Evidence (Optional)</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Screenshots, logs, or other evidence..."
                value={formData.evidence}
                onChange={(e) => setFormData({ ...formData, evidence: e.target.value })}
              />
            </div>

            <div>
              <label className="label">Remediation</label>
              <textarea
                required
                className="input"
                rows={4}
                placeholder="Recommended steps to fix this vulnerability..."
                value={formData.remediation}
                onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                {editingFinding ? 'Update Finding' : 'Add Finding'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingFinding(null)
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add/Edit IOC Modal */}
      <Modal
        isOpen={isIOCModalOpen}
        onClose={() => {
          setIsIOCModalOpen(false)
          setEditingIOC(null)
        }}
        title={editingIOC ? "Edit Indicator of Compromise" : "Add Indicator of Compromise"}
      >
        <form onSubmit={handleSubmitIOC} className="space-y-4">
          <div>
            <label className="label">IOC Type</label>
            <select
              className="input"
              value={iocFormData.type}
              onChange={(e) => setIOCFormData({ ...iocFormData, type: e.target.value as IOCType })}
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
              value={iocFormData.value}
              onChange={(e) => setIOCFormData({ ...iocFormData, value: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Timestamp</label>
            <input
              type="datetime-local"
              required
              className="input"
              value={iocFormData.timestamp}
              onChange={(e) => setIOCFormData({ ...iocFormData, timestamp: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Context (Optional)</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Additional context about this IOC..."
              value={iocFormData.context}
              onChange={(e) => setIOCFormData({ ...iocFormData, context: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Source (Optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., firewall logs, EDR alert"
              value={iocFormData.source}
              onChange={(e) => setIOCFormData({ ...iocFormData, source: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              {editingIOC ? 'Update IOC' : 'Add IOC'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsIOCModalOpen(false)
                setEditingIOC(null)
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import IOC Modal */}
      <IOCImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projectId={id || ''}
        onImportComplete={loadProject}
      />

      <ReportPreviewModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={currentProject}
        findings={findings}
        iocs={iocs}
        ttps={currentProject.ttpMappings || []}
      />
    </div>
  )
}
