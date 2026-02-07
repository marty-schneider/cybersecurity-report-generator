import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useNotificationStore, notify } from '../notificationStore'

describe('notificationStore', () => {
  beforeEach(() => {
    // Reset store state
    useNotificationStore.setState({ notifications: [] })
  })

  it('addNotification adds a notification to state', () => {
    useNotificationStore.getState().addNotification('success', 'Test message')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].type).toBe('success')
    expect(state.notifications[0].message).toBe('Test message')
  })

  it('generates unique IDs across calls', () => {
    useNotificationStore.getState().addNotification('success', 'First')
    useNotificationStore.getState().addNotification('error', 'Second')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(2)
    expect(state.notifications[0].id).not.toBe(state.notifications[1].id)
  })

  it('removeNotification removes the correct notification', () => {
    useNotificationStore.getState().addNotification('success', 'First')
    useNotificationStore.getState().addNotification('error', 'Second')

    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().removeNotification(id)

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].message).toBe('Second')
  })

  it('notify.success/error/warning/info convenience functions work', () => {
    notify.success('S')
    notify.error('E')
    notify.warning('W')
    notify.info('I')

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(4)
    expect(state.notifications.map(n => n.type)).toEqual(['success', 'error', 'warning', 'info'])
  })

  it('auto-removes notification after 5 seconds', () => {
    vi.useFakeTimers()

    useNotificationStore.getState().addNotification('info', 'Temporary')
    expect(useNotificationStore.getState().notifications).toHaveLength(1)

    vi.advanceTimersByTime(5000)

    expect(useNotificationStore.getState().notifications).toHaveLength(0)

    vi.useRealTimers()
  })
})
