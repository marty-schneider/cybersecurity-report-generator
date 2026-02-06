import { vi } from 'vitest'
import jwt from 'jsonwebtoken'
import { authenticate, authorize } from '../auth.js'
import { AppError } from '../errorHandler.js'
import { mockRequest, mockResponse, mockNext } from '../../__tests__/helpers/express.js'

const TEST_SECRET = 'test-secret-key-for-vitest'

function generateToken(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, TEST_SECRET, options)
}

describe('authenticate', () => {
  it('calls next() and sets req.user with a valid JWT', () => {
    const payload = { id: 'user-123', email: 'alice@example.com', role: 'USER' }
    const token = generateToken(payload)
    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    })
    const res = mockResponse()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect(next._error).toBeFalsy()
    expect(req.user).toMatchObject(payload)
  })

  it('calls next(AppError 401) when no Authorization header is present', () => {
    const req = mockRequest({ headers: {} })
    const res = mockResponse()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
    expect((next._error as AppError).message).toBe('No token provided')
  })

  it('calls next(AppError 401) when header does not start with "Bearer "', () => {
    const req = mockRequest({
      headers: { authorization: 'Token some-token-value' },
    })
    const res = mockResponse()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
    expect((next._error as AppError).message).toBe('No token provided')
  })

  it('calls next(AppError 401) for an expired token', () => {
    const payload = { id: 'user-123', email: 'alice@example.com', role: 'USER' }
    const token = generateToken(payload, { expiresIn: '-1s' })
    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    })
    const res = mockResponse()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
    expect((next._error as AppError).message).toBe('Invalid token')
  })

  it('calls next(AppError 401) for a token signed with the wrong secret', () => {
    const payload = { id: 'user-123', email: 'alice@example.com', role: 'USER' }
    const token = jwt.sign(payload, 'wrong-secret-key')
    const req = mockRequest({
      headers: { authorization: `Bearer ${token}` },
    })
    const res = mockResponse()
    const next = mockNext()

    authenticate(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
    expect((next._error as AppError).message).toBe('Invalid token')
  })
})

describe('authorize', () => {
  it('calls next() when user role is in allowed roles', () => {
    const req = mockRequest({
      user: { id: 'user-1', email: 'admin@example.com', role: 'ADMIN' },
    })
    const res = mockResponse()
    const next = mockNext()

    const middleware = authorize('ADMIN', 'MANAGER')
    middleware(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect(next._error).toBeFalsy()
  })

  it('calls next(AppError 403) when user role is not in allowed roles', () => {
    const req = mockRequest({
      user: { id: 'user-1', email: 'viewer@example.com', role: 'USER' },
    })
    const res = mockResponse()
    const next = mockNext()

    const middleware = authorize('ADMIN', 'MANAGER')
    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(403)
    expect((next._error as AppError).message).toBe('Not authorized')
  })

  it('calls next(AppError 401) when req.user is not set', () => {
    const req = mockRequest({ user: undefined })
    const res = mockResponse()
    const next = mockNext()

    const middleware = authorize('ADMIN')
    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next._error).toBeInstanceOf(AppError)
    expect((next._error as AppError).statusCode).toBe(401)
    expect((next._error as AppError).message).toBe('Not authenticated')
  })
})
