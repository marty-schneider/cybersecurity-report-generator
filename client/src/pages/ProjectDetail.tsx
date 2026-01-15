import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { projectService } from '../services/projectService'
import { findingService } from '../services/findingService'
import { useProjectStore } from '../store/projectStore'
import { Project, Finding, Severity } from '../types'
import Button from '../components/common/Button'
import Modal from '../components/common/Modal'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { getSeverityBadgeClass, getStatusBadgeClass } from '../constants/badgeColors'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()
  const [findings, setFindings] = useState<Finding[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM' as Severity,
    cvssScore: '',
    affectedSystems: '',
    evidence: '',
    remediation: '',
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
      const [projectData, findingsData] = await Promise.all([
        projectService.getById(id),
        findingService.getByProject(id),
      ])
      setCurrentProject(projectData as any)
      setFindings(findingsData)
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

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentProject.name}</h1>
            <p className="text-gray-600">Client: {currentProject.clientName}</p>
          </div>
          <div className="flex gap-3">
            <Link to={`/projects/${id}/threat-analysis`}>
              <Button>🔍 Threat Analysis</Button>
            </Link>
            <Link to={`/projects/${id}/report`}>
              <Button variant="primary">📄 Generate Report</Button>
            </Link>
            <Button variant="secondary">⚙️ Settings</Button>
          </div>
        </div>

        {/* Project Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <p className="text-sm text-gray-600 mb-1">Start Date</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(currentProject.startDate).toLocaleDateString()}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600 mb-1">Findings</p>
            <p className="text-lg font-semibold text-gray-900">{findings.length}</p>
          </div>
        </div>
      </div>

      {/* Findings Section */}
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

      {/* Add/Edit Finding Modal */}
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
    </div>
  )
}
