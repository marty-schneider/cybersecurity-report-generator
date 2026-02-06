import apiClient from './apiClient'
import { AppNotification, PaginatedNotificationResponse } from '../types'

export const notificationApiService = {
  async getNotifications(page = 1, unreadOnly = false): Promise<PaginatedNotificationResponse> {
    const params = new URLSearchParams({ page: page.toString() })
    if (unreadOnly) params.append('unreadOnly', 'true')
    const res = await apiClient.get(`/notifications?${params}`)
    return res.data
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get('/notifications/unread-count')
    return res.data.count
  },

  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`)
  },

  async markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all')
  },
}
