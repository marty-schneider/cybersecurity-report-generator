import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it('initial state has null user/token and false isAuthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setAuth sets user, token, and isAuthenticated', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER' }
    useAuthStore.getState().setAuth(user as any, 'jwt-token-123')

    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.token).toBe('jwt-token-123')
    expect(state.isAuthenticated).toBe(true)
  })

  it('logout clears all auth state', () => {
    const user = { id: 'u1', name: 'Test', email: 'test@test.com', role: 'USER' }
    useAuthStore.getState().setAuth(user as any, 'jwt-token-123')
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
