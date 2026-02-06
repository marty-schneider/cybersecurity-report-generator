import { vi } from 'vitest'
import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../../middleware/auth.js'

export function mockRequest(overrides: Record<string, unknown> = {}): AuthRequest {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    user: { id: 'test-user-id', email: 'test@example.com', role: 'USER' },
    ...overrides,
  } as unknown as AuthRequest
}

export function mockResponse() {
  const res = {
    _status: 200,
    _json: null as unknown,
    _data: null as unknown,
    _headers: {} as Record<string, string>,
    status(code: number) { res._status = code; return res },
    json(data: unknown) { res._json = data; return res },
    send(data: unknown) { res._data = data; return res },
    setHeader(key: string, value: string) { res._headers[key] = value; return res },
  }
  return res as typeof res & Response
}

export function mockNext(): NextFunction & { _error: unknown } {
  const next = vi.fn((err?: unknown) => { next._error = err }) as unknown as NextFunction & { _error: unknown }
  next._error = null
  return next
}
