import { create } from 'zustand'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  message: string
}

interface NotificationState {
  notifications: Notification[]
  addNotification: (type: NotificationType, message: string) => void
  removeNotification: (id: string) => void
}

let counter = 0

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (type, message) => {
    const id = `notification-${++counter}`
    set((state) => ({
      notifications: [...state.notifications, { id, type, message }],
    }))
    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
      }))
    }, 5000)
  },
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}))

// Convenience functions
export const notify = {
  success: (message: string) => useNotificationStore.getState().addNotification('success', message),
  error: (message: string) => useNotificationStore.getState().addNotification('error', message),
  warning: (message: string) => useNotificationStore.getState().addNotification('warning', message),
  info: (message: string) => useNotificationStore.getState().addNotification('info', message),
}
