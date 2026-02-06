import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectService } from '../services/projectService'
import { findingService } from '../services/findingService'
import { iocService } from '../services/iocService'
import { attachmentService } from '../services/attachmentService'
import { ttpService } from '../services/ttpService'
import { useProjectStore } from '../store/projectStore'
import { Project, Finding, FindingTemplate, Severity, IOC, Attachment } from '../types'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import IOCImportModal from '../components/ioc/IOCImportModal'
import IOCFormModal from '../components/ioc/IOCFormModal'
import IOCList from '../components/ioc/IOCList'
import ReportPreviewModal from '../components/report/ReportPreviewModal'
import RemediationPanel from '../components/finding/RemediationPanel'
import RemediationDashboard from '../components/finding/RemediationDashboard'
import AttachmentUploader from '../components/finding/AttachmentUploader'
import AttachmentGallery from '../components/finding/AttachmentGallery'
import TemplatePickerModal from '../components/finding/TemplatePickerModal'
import CVEInfoCard from '../components/finding/CVEInfoCard'
import { SeverityBadge, StatusBadge } from '../components/badges'
import { useIOCForm } from '../hooks/useIOCForm'
import { notify } from '../store/notificationStore'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()
  const [findings, setFindings] = useState<Finding[]>([])
  const [iocs, setIOCs] = useState<IOC[]>([])
  const [loading, setLoading] = useState(true)
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null)
  const [showRemediationDashboard, setShowRemediationDashboard] = useState(false)
  const [findingAttachments, setFindingAttachments] = useState<Record<string, Attachment[]>>({})
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false)
  const [findingFormData, setFindingFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as Severity,
    cvssScore: '',
    affectedSystems: '',
    evidence: '',
    remediation: '',
  })

  const iocForm = useIOCForm({
    projectId: id,
    iocs,
    setIOCs,
    onError: (msg) => notify.error(msg),
  })

  useEffect(() => {
    if (id) loadProject()
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
    } catch {
      notify.error('Failed to load project')
      navigate('/projects')
    } finally {
      setLoading(false)
    }
  }

  // Finding handlers
  const handleSubmitFinding = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    try {
      const data = {
        title: findingFormData.title,
        description: findingFormData.description,
        severity: findingFormData.severity,
        cvssScore: findingFormData.cvssScore ? parseFloat(findingFormData.cvssScore) : undefined,
        affectedSystems: findingFormData.affectedSystems.split(',').map((s) => s.trim()).filter(Boolean),
        evidence: findingFormData.evidence || undefined,
        remediation: findingFormData.remediation,
      }

      if (editingFinding) {
        const updated = await findingService.update(editingFinding.id, data)
        setFindings(findings.map(f => f.id === editingFinding.id ? updated : f))
      } else {
        const created = await findingService.create({ projectId: id, ...data })
        setFindings([created, ...findings])
      }

      closeFindingModal()
    } catch {
      notify.error(`Failed to ${editingFinding ? 'update' : 'create'} finding`)
    }
  }

  const handleEditFinding = (finding: Finding) => {
    setEditingFinding(finding)
    setFindingFormData({
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      cvssScore: finding.cvssScore?.toString() || '',
      affectedSystems: finding.affectedSystems.join(', '),
      evidence: finding.evidence || '',
      remediation: finding.remediation,
    })
    setIsFindingModalOpen(true)
  }

  const handleDeleteFinding = async (finding: Finding) => {
    if (!confirm(`Are you sure you want to delete the finding "${finding.title}"?`)) return
    try {
      await findingService.delete(finding.id)
      setFindings(findings.filter(f => f.id !== finding.id))
    } catch {
      notify.error('Failed to delete finding')
    }
  }

  const handleAddNewFinding = () => {
    setEditingFinding(null)
    setFindingFormData({
      title: '', description: '', severity: 'MEDIUM',
      cvssScore: '', affectedSystems: '', evidence: '', remediation: '',
    })
    setIsFindingModalOpen(true)
  }

  const closeFindingModal = () => {
    setIsFindingModalOpen(false)
    setEditingFinding(null)
    setFindingFormData({
      title: '', description: '', severity: 'MEDIUM',
      cvssScore: '', affectedSystems: '', evidence: '', remediation: '',
    })
  }

  const handleSelectTemplate = (template: FindingTemplate) => {
    setEditingFinding(null)
    setFindingFormData({
      title: template.title,
      description: template.description,
      severity: template.severity,
      cvssScore: template.cvssScore?.toString() || '',
      affectedSystems: '',
      evidence: '',
      remediation: template.remediation,
    })
    setIsFindingModalOpen(true)
  }

  const handleAnalyzeIOCs = async () => {
    if (!id) return
    try {
      setIsAnalyzing(true)
      await ttpService.analyze(id)
      notify.success('AI analysis complete! View full results in Threat Analysis page.')
    } catch {
      notify.error('Analysis failed')
    } finally {
      setIsAnalyzing(false)
    }
  }

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
          <Button onClick={() => navigate('/projects')} className="mt-4">Back to Projects</Button>
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
            <Link to={`/projects/${id}/audit`}>
              <Button variant="secondary">📋 Audit Log</Button>
            </Link>
            <Button onClick={() => setIsReportModalOpen(true)} variant="primary">📄 Generate Report</Button>
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
              <Button onClick={iocForm.handleAddNew} variant="primary">+ Add IOC</Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">📄 Import from File</Button>
              {iocs.length > 0 && (
                <Button onClick={handleAnalyzeIOCs} disabled={isAnalyzing} variant="primary">
                  {isAnalyzing ? 'Analyzing...' : '🤖 Analyze Incident'}
                </Button>
              )}
            </div>
          </div>

          {iocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No indicators documented yet. Start by adding IOCs from the incident.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={iocForm.handleAddNew} variant="primary">+ Add First IOC</Button>
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">📄 Import from File</Button>
              </div>
            </div>
          ) : (
            <IOCList iocs={iocs} onEdit={iocForm.handleEdit} onDelete={iocForm.handleDelete} variant="timeline" />
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

      {/* Remediation Dashboard - Only show for non-IR projects */}
      {!isIncidentResponse && findings.length > 0 && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Remediation Tracking</h2>
            <Button
              variant="secondary"
              onClick={() => setShowRemediationDashboard(!showRemediationDashboard)}
            >
              {showRemediationDashboard ? 'Hide Dashboard' : 'Show Dashboard'}
            </Button>
          </div>
          {showRemediationDashboard && id && (
            <RemediationDashboard projectId={id} />
          )}
        </div>
      )}

      {/* Findings Section - Only show for non-IR projects */}
      {!isIncidentResponse && (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Findings</h2>
            <div className="flex gap-2">
              <Button onClick={() => setIsTemplatePickerOpen(true)} variant="secondary">Use Template</Button>
              <Button onClick={handleAddNewFinding}>+ Add Finding</Button>
            </div>
          </div>

          {findings.length === 0 ? (
            <p className="text-gray-600">No findings yet. Add your first security finding to get started.</p>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => (
                <div key={finding.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <SeverityBadge severity={finding.severity} />
                      <h3 className="font-semibold text-gray-900">{finding.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      {finding.cvssScore && (
                        <span className="text-sm text-gray-600">CVSS: {finding.cvssScore}</span>
                      )}
                      <StatusBadge status={finding.status} />
                      <button
                        onClick={() => {
                          const newId = expandedFindingId === finding.id ? null : finding.id
                          setExpandedFindingId(newId)
                          if (newId && !findingAttachments[finding.id]) {
                            attachmentService.list(finding.id).then(atts => {
                              setFindingAttachments(prev => ({ ...prev, [finding.id]: atts }))
                            }).catch(() => {})
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 text-xs px-2 py-1"
                        title="Remediation & Evidence"
                      >
                        {expandedFindingId === finding.id ? '▼ Details' : '▶ Details'}
                      </button>
                      <button onClick={() => handleEditFinding(finding)} className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1" title="Edit Finding">✏️</button>
                      <button onClick={() => handleDeleteFinding(finding)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1" title="Delete Finding">🗑️</button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 line-clamp-2">{finding.description}</p>
                  {finding.affectedSystems.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {finding.affectedSystems.map((system, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{system}</span>
                      ))}
                    </div>
                  )}
                  {expandedFindingId === finding.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-6">
                      <RemediationPanel
                        finding={finding}
                        onUpdate={(updated) => setFindings(findings.map(f => f.id === updated.id ? updated : f))}
                      />
                      {finding.cveData && (
                        <div className="border-t border-gray-200 pt-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">CVE Information</h4>
                          <CVEInfoCard cveData={finding.cveData} />
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Evidence & Attachments</h4>
                        <AttachmentUploader
                          findingId={finding.id}
                          onUpload={(att) => setFindingAttachments(prev => ({
                            ...prev,
                            [finding.id]: [att, ...(prev[finding.id] || [])],
                          }))}
                        />
                        <div className="mt-3">
                          <AttachmentGallery
                            findingId={finding.id}
                            attachments={findingAttachments[finding.id] || []}
                            onDelete={(attId) => setFindingAttachments(prev => ({
                              ...prev,
                              [finding.id]: (prev[finding.id] || []).filter(a => a.id !== attId),
                            }))}
                          />
                        </div>
                      </div>
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
              <Button onClick={iocForm.handleAddNew} variant="secondary">+ Add IOC</Button>
              <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">📄 Import from File</Button>
              {iocs.length > 0 && (
                <Button onClick={handleAnalyzeIOCs} disabled={isAnalyzing} variant="primary">
                  {isAnalyzing ? 'Analyzing...' : '🤖 Analyze with AI'}
                </Button>
              )}
            </div>
          </div>

          {iocs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No IOCs yet. Add indicators to enable AI-powered threat analysis.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={iocForm.handleAddNew} variant="primary">+ Add Your First IOC</Button>
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary">📄 Import from File</Button>
              </div>
            </div>
          ) : (
            <IOCList iocs={iocs} onEdit={iocForm.handleEdit} onDelete={iocForm.handleDelete} />
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

      {/* Add/Edit Finding Modal */}
      {!isIncidentResponse && (
        <Modal
          isOpen={isFindingModalOpen}
          onClose={closeFindingModal}
          title={editingFinding ? 'Edit Security Finding' : 'Add Security Finding'}
        >
          <form onSubmit={handleSubmitFinding} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input type="text" required className="input" placeholder="e.g., SQL Injection in Login Form" value={findingFormData.title} onChange={(e) => setFindingFormData({ ...findingFormData, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={findingFormData.severity} onChange={(e) => setFindingFormData({ ...findingFormData, severity: e.target.value as Severity })}>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
                <option value="INFO">Informational</option>
              </select>
            </div>
            <div>
              <label className="label">CVSS Score (Optional)</label>
              <input type="number" step="0.1" min="0" max="10" className="input" placeholder="e.g., 7.5" value={findingFormData.cvssScore} onChange={(e) => setFindingFormData({ ...findingFormData, cvssScore: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea required className="input" rows={4} placeholder="Detailed description of the vulnerability..." value={findingFormData.description} onChange={(e) => setFindingFormData({ ...findingFormData, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Affected Systems (comma-separated)</label>
              <input type="text" className="input" placeholder="e.g., web-server-01, api.example.com" value={findingFormData.affectedSystems} onChange={(e) => setFindingFormData({ ...findingFormData, affectedSystems: e.target.value })} />
            </div>
            <div>
              <label className="label">Evidence (Optional)</label>
              <textarea className="input" rows={3} placeholder="Screenshots, logs, or other evidence..." value={findingFormData.evidence} onChange={(e) => setFindingFormData({ ...findingFormData, evidence: e.target.value })} />
            </div>
            <div>
              <label className="label">Remediation</label>
              <textarea required className="input" rows={4} placeholder="Recommended steps to fix this vulnerability..." value={findingFormData.remediation} onChange={(e) => setFindingFormData({ ...findingFormData, remediation: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">{editingFinding ? 'Update Finding' : 'Add Finding'}</Button>
              <Button type="button" variant="secondary" onClick={closeFindingModal}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add/Edit IOC Modal */}
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
        projectId={id || ''}
        onImportComplete={loadProject}
      />

      <ReportPreviewModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        project={currentProject}
      />

      <TemplatePickerModal
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelect={handleSelectTemplate}
      />
    </div>
  )
}
