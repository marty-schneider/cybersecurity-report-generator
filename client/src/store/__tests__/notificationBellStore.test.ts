import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationBellStore } from '../notificationBellStore'

// Mock the API service
vi.mock('../../services/notificationApiService', () => ({
  notificationApiService: {
    getUnreadCount: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}))

import { notificationApiService } from '../../services/notificationApiService'

describe('notificationBellStore', () => {
  beforeEach(() => {
    useNotificationBellStore.setState({
      unreadCount: 0,
      notifications: [],
      loading: false,
    })
    vi.clearAllMocks()
  })

  it('fetchUnreadCount sets unreadCount from API', async () => {
    vi.mocked(notificationApiService.getUnreadCount).mockResolvedValueOnce(7)

    await useNotificationBellStore.getState().fetchUnreadCount()

    expect(useNotificationBellStore.getState().unreadCount).toBe(7)
  })

  it('fetchNotifications sets notifications and loading', async () => {
    const mockNotifications = [
      { id: 'n1', title: 'Test', type: 'REPORT_COMPLETED', isRead: false },
    ]
    vi.mocked(notificationApiService.getNotifications).mockResolvedValueOnce({
      notifications: mockNotifications as any,
      total: 1,
      page: 1,
      totalPages: 1,
    })

    await useNotificationBellStore.getState().fetchNotifications()

    const state = useNotificationBellStore.getState()
    expect(state.notifications).toEqual(mockNotifications)
    expect(state.loading).toBe(false)
  })

  it('markRead updates notification in state and decrements count', async () => {
    useNotificationBellStore.setState({
      unreadCount: 3,
      notifications: [
        { id: 'n1', title: 'Test', isRead: false } as any,
        { id: 'n2', title: 'Test 2', isRead: false } as any,
      ],
    })
    vi.mocked(notificationApiService.markAsRead).mockResolvedValueOnce()

    await useNotificationBellStore.getState().markRead('n1')

    const state = useNotificationBellStore.getState()
    expect(state.notifications[0].isRead).toBe(true)
    expect(state.notifications[1].isRead).toBe(false)
    expect(state.unreadCount).toBe(2)
  })

  it('markAllRead marks all notifications as read and sets count to 0', async () => {
    useNotificationBellStore.setState({
      unreadCount: 5,
      notifications: [
        { id: 'n1', isRead: false } as any,
        { id: 'n2', isRead: false } as any,
      ],
    })
    vi.mocked(notificationApiService.markAllAsRead).mockResolvedValueOnce()

    await useNotificationBellStore.getState().markAllRead()

    const state = useNotificationBellStore.getState()
    expect(state.notifications.every(n => n.isRead)).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('unreadCount never goes below 0', async () => {
    useNotificationBellStore.setState({
      unreadCount: 0,
      notifications: [{ id: 'n1', isRead: false } as any],
    })
    vi.mocked(notificationApiService.markAsRead).mockResolvedValueOnce()

    await useNotificationBellStore.getState().markRead('n1')

    expect(useNotificationBellStore.getState().unreadCount).toBe(0)
  })

  it('API failures do not break state', async () => {
    vi.mocked(notificationApiService.getUnreadCount).mockRejectedValueOnce(new Error('Network error'))

    await useNotificationBellStore.getState().fetchUnreadCount()

    // State should remain unchanged
    expect(useNotificationBellStore.getState().unreadCount).toBe(0)
  })
})
