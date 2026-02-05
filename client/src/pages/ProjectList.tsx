import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProjectStore } from '../store/projectStore'
import { projectService } from '../services/projectService'
import { Project } from '../types'
import Button from '../components/common/Button'
import ProjectModal from '../components/project/ProjectModal'
import { AssessmentTypeBadge } from '../components/badges'
import { notify } from '../store/notificationStore'

export default function ProjectList() {
  const { projects, setProjects } = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.getAll()
      setProjects(data)
    } catch {
      notify.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const handleProjectCreated = (newProject: Project) => {
    setProjects([newProject, ...projects])
    setIsModalOpen(false)
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
                  <AssessmentTypeBadge type={project.assessmentType} />
                </div>
                <p className="text-sm text-gray-600 mb-4">Client: {project.clientName}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Start: {new Date(project.startDate).toLocaleDateString()}</span>
                  <span
                    className={`font-medium ${project.status === 'ACTIVE'
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

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  )
}
