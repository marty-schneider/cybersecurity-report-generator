import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { projectService } from '../services/projectService'
import { Project } from '../types'
import LoadingSkeleton from '../components/LoadingSkeleton'
import { getProjectStatusClass } from '../constants/badgeColors'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalFindings: 0,
    iocsAnalyzed: 0,
    criticalFindings: 0,
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const projectsData = await projectService.getAll()
      setProjects(projectsData)

      // Calculate stats
      const activeCount = projectsData.filter((p) => p.status === 'ACTIVE').length
      const findingsCount = projectsData.reduce((sum, p: any) => sum + (p._count?.findings || 0), 0)
      const iocsCount = projectsData.reduce((sum, p: any) => sum + (p._count?.iocs || 0), 0)

      setStats({
        activeProjects: activeCount,
        totalFindings: findingsCount,
        iocsAnalyzed: iocsCount,
        criticalFindings: 0, // Would need to fetch findings to get this
      })
    } catch (error: any) {
      console.error('Failed to load dashboard:', error)
      console.error('Error details:', error.response?.data || error.message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  const recentProjects = projects.slice(0, 5)

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
        <LoadingSkeleton type="card" count={4} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Projects</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.activeProjects}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Projects</h3>
          <p className="text-3xl font-bold text-gray-900">{projects.length}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Findings</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.totalFindings}</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-600 mb-2">IOCs Analyzed</h3>
          <p className="text-3xl font-bold text-gray-900">{stats.iocsAnalyzed}</p>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <Link to="/projects" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All →
          </Link>
        </div>

        {recentProjects.length === 0 ? (
          <p className="text-gray-600">No projects yet. Create your first project to get started.</p>
        ) : (
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`}>
                <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-gray-600">{project.clientName}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${getProjectStatusClass(project.status)}`}>
                        {project.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/projects">
            <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors text-left">
              <div className="text-2xl mb-2">📁</div>
              <h3 className="font-medium text-gray-900">New Project</h3>
              <p className="text-sm text-gray-600">Start a new assessment</p>
            </button>
          </Link>

          <Link to="/projects">
            <button className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors text-left">
              <div className="text-2xl mb-2">🔍</div>
              <h3 className="font-medium text-gray-900">View Projects</h3>
              <p className="text-sm text-gray-600">Browse all assessments</p>
            </button>
          </Link>

          <button
            className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors text-left"
            disabled
          >
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-medium text-gray-900">Generate Report</h3>
            <p className="text-sm text-gray-600">Export to PDF/DOCX</p>
          </button>
        </div>
      </div>
    </div>
  )
}
