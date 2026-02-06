import { create } from 'zustand'
import { notificationApiService } from '../services/notificationApiService'
import { AppNotification } from '../types'

interface NotificationBellState {
  unreadCount: number
  notifications: AppNotification[]
  loading: boolean
  fetchUnreadCount: () => Promise<void>
  fetchNotifications: (page?: number) => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationBellStore = create<NotificationBellState>((set) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,

  fetchUnreadCount: async () => {
    try {
      const count = await notificationApiService.getUnreadCount()
      set({ unreadCount: count })
    } catch {
      // Silently ignore
    }
  },

  fetchNotifications: async (page = 1) => {
    try {
      set({ loading: true })
      const data = await notificationApiService.getNotifications(page)
      set({ notifications: data.notifications, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markRead: async (id: string) => {
    try {
      await notificationApiService.markAsRead(id)
      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    } catch {
      // Ignore
    }
  },

  markAllRead: async () => {
    try {
      await notificationApiService.markAllAsRead()
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
        unreadCount: 0,
      }))
    } catch {
      // Ignore
    }
  },
}))
