import { useNotificationStore } from '../../store/notificationStore'

const typeStyles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
}

export default function ToastContainer() {
  const { notifications, removeNotification } = useNotificationStore()

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border-l-4 p-4 rounded shadow-lg animate-fade-in ${typeStyles[notification.type]}`}
          role="alert"
        >
          <div className="flex justify-between items-start gap-2">
            <p className="text-sm">{notification.message}</p>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-current opacity-50 hover:opacity-100 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
