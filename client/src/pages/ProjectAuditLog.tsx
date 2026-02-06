import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { auditService, AuditLogFilters } from '../services/auditService'
import { AuditLog, AuditAction } from '../types'
import AuditLogTable from '../components/audit/AuditLogTable'
import { notify } from '../store/notificationStore'

export default function ProjectAuditLog() {
  const { id } = useParams<{ id: string }>()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<AuditLogFilters>({})

  const fetchLogs = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      const data = await auditService.getProjectLog(id, { ...filters, page, limit: 50 })
      setLogs(data.logs)
      setTotal(data.total)
      setTotalPages(data.totalPages)
    } catch {
      notify.error('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [id, page, filters])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const handleFilterChange = (newFilters: { action?: AuditAction; entityType?: string }) => {
    setPage(1)
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600 mt-1">Track all changes and actions in this project</p>
        </div>
        <Link to={`/projects/${id}`}>
          <button className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50">
            Back to Project
          </button>
        </Link>
      </div>

      <div className="card">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <AuditLogTable
            logs={logs}
            total={total}
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
          />
        )}
      </div>
    </div>
  )
}
