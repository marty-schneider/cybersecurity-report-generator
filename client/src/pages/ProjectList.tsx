import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { projectService } from '../services/projectService'
import { AssessmentType } from '../types'
import Modal from '../components/common/Modal'
import Button from '../components/common/Button'

export default function ProjectList() {
  const { projects, setProjects } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    assessmentType: 'PENTEST' as AssessmentType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.getAll()
      setProjects(data)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const newProject = await projectService.create({
        ...formData,
        endDate: formData.endDate || undefined,
      })
      setProjects([newProject, ...projects])
      setIsModalOpen(false)
      setFormData({
        name: '',
        clientName: '',
        assessmentType: 'PENTEST',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      })
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create project')
    } finally {
      setCreating(false)
    }
  }

  const getAssessmentTypeBadge = (type: AssessmentType) => {
    const colors = {
      PENTEST: 'bg-purple-100 text-purple-700',
      VULN_ASSESSMENT: 'bg-blue-100 text-blue-700',
      SECURITY_AUDIT: 'bg-green-100 text-green-700',
      RED_TEAM: 'bg-red-100 text-red-700',
    }
    const labels = {
      PENTEST: 'Penetration Test',
      VULN_ASSESSMENT: 'Vulnerability Assessment',
      SECURITY_AUDIT: 'Security Audit',
      RED_TEAM: 'Red Team',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type]}`}>
        {labels[type]}
      </span>
    )
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Projects</h1>
        <div className="card">
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <Button onClick={() => setIsModalOpen(true)}>+ New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <p className="text-gray-600">No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <div className="card hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                  {getAssessmentTypeBadge(project.assessmentType)}
                </div>
                <p className="text-sm text-gray-600 mb-4">Client: {project.clientName}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                  <span
                    className={`font-medium ${
                      project.status === 'ACTIVE'
                        ? 'text-green-600'
                        : project.status === 'COMPLETED'
                        ? 'text-blue-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Project">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="label">Project Name</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Client Name</label>
            <input
              type="text"
              required
              className="input"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Assessment Type</label>
            <select
              className="input"
              value={formData.assessmentType}
              onChange={(e) => setFormData({ ...formData, assessmentType: e.target.value as AssessmentType })}
            >
              <option value="PENTEST">Penetration Test</option>
              <option value="VULN_ASSESSMENT">Vulnerability Assessment</option>
              <option value="SECURITY_AUDIT">Security Audit</option>
              <option value="RED_TEAM">Red Team</option>
            </select>
          </div>

          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              required
              className="input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>

          <div>
            <label className="label">End Date (Optional)</label>
            <input
              type="date"
              className="input"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={creating} className="flex-1">
              {creating ? 'Creating...' : 'Create Project'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
