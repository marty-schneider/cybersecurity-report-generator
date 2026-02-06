import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import { generateToken, verifyToken } from '../jwt.js'

describe('generateToken', () => {
  it('returns a string token', () => {
    const token = generateToken({ id: 'user-1', email: 'a@b.com', role: 'USER' })
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
  })

  it('embeds id, email, and role in the payload', () => {
    const payload = { id: 'user-1', email: 'a@b.com', role: 'ADMIN' }
    const token = generateToken(payload)
    const decoded = jwt.decode(token) as Record<string, unknown>
    expect(decoded.id).toBe('user-1')
    expect(decoded.email).toBe('a@b.com')
    expect(decoded.role).toBe('ADMIN')
  })

  it('sets an expiration', () => {
    const token = generateToken({ id: 'user-1', email: 'a@b.com', role: 'USER' })
    const decoded = jwt.decode(token) as Record<string, unknown>
    expect(decoded.exp).toBeDefined()
  })
})

describe('verifyToken', () => {
  it('returns the original payload for a valid token', () => {
    const payload = { id: 'user-1', email: 'a@b.com', role: 'USER' }
    const token = generateToken(payload)
    const result = verifyToken(token)
    expect(result.id).toBe('user-1')
    expect(result.email).toBe('a@b.com')
    expect(result.role).toBe('USER')
  })

  it('throws for an expired token', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '0s' }
    )
    expect(() => verifyToken(token)).toThrow()
  })

  it('throws for a token signed with the wrong secret', () => {
    const token = jwt.sign(
      { id: 'u1', email: 'a@b.com', role: 'USER' },
      'wrong-secret',
      { expiresIn: '1h' }
    )
    expect(() => verifyToken(token)).toThrow()
  })
})
