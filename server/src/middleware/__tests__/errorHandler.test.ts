import { vi } from 'vitest'
import { AppError, errorHandler } from '../errorHandler.js'
import { mockRequest, mockResponse } from '../../__tests__/helpers/express.js'

describe('AppError', () => {
  it('sets statusCode, message, and isOperational', () => {
    const err = new AppError('Not found', 404)
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.isOperational).toBe(true)
  })

  it('is an instance of Error', () => {
    const err = new AppError('Bad request', 400)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })
})

describe('errorHandler', () => {
  const next = vi.fn()

  it('returns statusCode and message for AppError', () => {
    const err = new AppError('Forbidden', 403)
    const req = mockRequest({ originalUrl: '/api/test', method: 'GET' })
    const res = mockResponse()

    errorHandler(err, req, res, next)

    expect(res._status).toBe(403)
    expect(res._json).toEqual({ status: 'error', message: 'Forbidden' })
  })

  it('returns 500 for non-AppError', () => {
    const err = new Error('Something broke')
    const req = mockRequest({ originalUrl: '/api/test', method: 'POST' })
    const res = mockResponse()

    errorHandler(err, req, res, next)

    expect(res._status).toBe(500)
  })

  it('returns generic message in production mode for non-AppError', () => {
    const original = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const err = new Error('Sensitive details')
      const req = mockRequest({ originalUrl: '/api/test', method: 'GET' })
      const res = mockResponse()

      errorHandler(err, req, res, next)

      expect(res._json).toEqual({ status: 'error', message: 'Internal server error' })
    } finally {
      process.env.NODE_ENV = original
    }
  })

  it('sets CORS headers for allowed origin', () => {
    const err = new AppError('Not found', 404)
    const req = mockRequest({ headers: { origin: 'http://localhost:3000' }, originalUrl: '/api/test', method: 'GET' })
    const res = mockResponse()

    errorHandler(err, req, res, next)

    expect(res._headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
    expect(res._headers['Access-Control-Allow-Credentials']).toBe('true')
  })

  it('does NOT set CORS headers for disallowed origin', () => {
    const err = new AppError('Not found', 404)
    const req = mockRequest({ headers: { origin: 'http://evil-site.com' }, originalUrl: '/api/test', method: 'GET' })
    const res = mockResponse()

    errorHandler(err, req, res, next)

    expect(res._headers['Access-Control-Allow-Origin']).toBeUndefined()
  })
})
