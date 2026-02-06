import { useState } from 'react'
import { AuditLog, AuditAction } from '../../types'
import { AuditActionBadge } from '../badges'

interface AuditLogTableProps {
  logs: AuditLog[]
  total: number
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  onFilterChange: (filters: { action?: AuditAction; entityType?: string }) => void
}

const ENTITY_TYPES = ['Finding', 'IOC', 'TTPMapping', 'Project', 'Report']
const AUDIT_ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'SHARE', 'LOGIN']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogTable({
  logs,
  total,
  page,
  totalPages,
  onPageChange,
  onFilterChange,
}: AuditLogTableProps) {
  const [actionFilter, setActionFilter] = useState<string>('')
  const [entityFilter, setEntityFilter] = useState<string>('')

  const handleActionChange = (value: string) => {
    setActionFilter(value)
    onFilterChange({
      action: value ? (value as AuditAction) : undefined,
      entityType: entityFilter || undefined,
    })
  }

  const handleEntityChange = (value: string) => {
    setEntityFilter(value)
    onFilterChange({
      action: actionFilter ? (actionFilter as AuditAction) : undefined,
      entityType: value || undefined,
    })
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="text-sm text-gray-600 mr-2">Action:</label>
          <select
            className="input py-1 px-2 text-sm w-auto"
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
          >
            <option value="">All</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-600 mr-2">Entity:</label>
          <select
            className="input py-1 px-2 text-sm w-auto"
            value={entityFilter}
            onChange={(e) => handleEntityChange(e.target.value)}
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-500 self-end ml-auto">
          {total} total entries
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-gray-600 font-medium">Timestamp</th>
              <th className="text-left py-3 px-2 text-gray-600 font-medium">User</th>
              <th className="text-left py-3 px-2 text-gray-600 font-medium">Action</th>
              <th className="text-left py-3 px-2 text-gray-600 font-medium">Entity</th>
              <th className="text-left py-3 px-2 text-gray-600 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-2 text-gray-600 whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                  <td className="py-2 px-2">
                    <span className="font-medium text-gray-900">
                      {log.user?.name || log.userId}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <AuditActionBadge action={log.action} />
                  </td>
                  <td className="py-2 px-2 text-gray-700">
                    {log.entityType}
                    {log.entityId && (
                      <span className="text-gray-400 text-xs ml-1" title={log.entityId}>
                        ({log.entityId.slice(0, 8)}...)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-gray-500 text-xs max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details).slice(0, 100) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 text-sm rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
