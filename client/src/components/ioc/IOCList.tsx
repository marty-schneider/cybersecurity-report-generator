import { IOC } from '../../types'
import { IOCTypeBadge } from '../badges'

interface IOCListProps {
  iocs: IOC[]
  onEdit: (ioc: IOC) => void
  onDelete: (ioc: IOC) => void
  variant?: 'default' | 'timeline'
}

export default function IOCList({ iocs, onEdit, onDelete, variant = 'default' }: IOCListProps) {
  if (iocs.length === 0) return null

  const sortedIOCs = variant === 'timeline'
    ? [...iocs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : iocs

  const borderColor = variant === 'timeline' ? 'border-orange-500' : 'border-primary-500'

  return (
    <div className="space-y-3">
      {sortedIOCs.map((ioc) => (
        <div key={ioc.id} className={`border-l-4 ${borderColor} pl-4 py-2 hover:bg-gray-50 transition-colors`}>
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2 flex-1">
              {variant === 'timeline' && (
                <span className="text-xs font-semibold text-orange-600 min-w-[140px]">
                  {new Date(ioc.timestamp).toLocaleString()}
                </span>
              )}
              <IOCTypeBadge type={ioc.type} />
              <span className="font-mono text-sm text-gray-900">{ioc.value}</span>
            </div>
            <div className="flex items-center gap-2">
              {variant !== 'timeline' && (
                <span className="text-xs text-gray-500">
                  {new Date(ioc.timestamp).toLocaleString()}
                </span>
              )}
              <button
                onClick={() => onEdit(ioc)}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1"
                title="Edit IOC"
              >
                ✏️
              </button>
              <button
                onClick={() => onDelete(ioc)}
                className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                title="Delete IOC"
              >
                🗑️
              </button>
            </div>
          </div>
          {ioc.context && (
            <p className={`text-sm text-gray-600 mt-1 ${variant === 'timeline' ? 'ml-[140px]' : ''}`}>
              {ioc.context}
            </p>
          )}
          {ioc.source && (
            <p className={`text-xs text-gray-500 mt-1 ${variant === 'timeline' ? 'ml-[140px]' : ''}`}>
              Source: {ioc.source}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
