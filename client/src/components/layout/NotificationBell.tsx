import { useEffect, useState } from 'react'
import { useNotificationBellStore } from '../../store/notificationBellStore'
import { formatDistanceToNow } from 'date-fns'

const TYPE_ICONS: Record<string, string> = {
  FINDING_ASSIGNED: '🎯',
  FINDING_STATUS_CHANGED: '🔄',
  REPORT_COMPLETED: '📄',
  PROJECT_STATUS_CHANGED: '📊',
  PROJECT_MEMBER_ADDED: '👤',
  REMEDIATION_DUE: '⏰',
  SYSTEM: '🔔',
}

export default function NotificationBell() {
  const { unreadCount, notifications, loading, fetchUnreadCount, fetchNotifications, markRead, markAllRead } = useNotificationBellStore()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    fetchUnreadCount()
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const handleOpen = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      fetchNotifications()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-xs text-primary-600 hover:text-primary-700"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications</div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => { if (!n.isRead) markRead(n.id) }}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      !n.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex gap-2">
                      <span className="text-sm flex-shrink-0">{TYPE_ICONS[n.type] || '🔔'}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
