import { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { projectService } from '../../services/projectService'
import { Project, AssessmentType } from '../../types'

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (project: Project) => void
}

export default function ProjectModal({ isOpen, onClose, onSuccess }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    clientName: '',
    assessmentType: 'PENTEST' as AssessmentType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCreating(true)

    try {
      const newProject = await projectService.create({
        ...formData,
        endDate: formData.endDate || undefined,
      })
      onSuccess(newProject)
      onClose()
      // Reset form data
      setFormData({
        name: '',
        clientName: '',
        assessmentType: 'PENTEST',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
      })
    } catch (err: any) {
      console.error('Failed to create project:', err)
      console.error('Error response:', err.response?.data)
      console.error('Error status:', err.response?.status)
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create project'
      setError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const handleClose = () => {
    if (!creating) {
      setError('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Project">
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
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  )
}
