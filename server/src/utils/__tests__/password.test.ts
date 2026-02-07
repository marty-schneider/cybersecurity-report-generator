import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword } from '../password.js'

describe('hashPassword', () => {
  it('returns a string different from the input', async () => {
    const hash = await hashPassword('myPassword123')
    expect(typeof hash).toBe('string')
    expect(hash).not.toBe('myPassword123')
  })

  it('produces different hashes for the same input (salting)', async () => {
    const hash1 = await hashPassword('samePassword')
    const hash2 = await hashPassword('samePassword')
    expect(hash1).not.toBe(hash2)
  })
})

describe('comparePassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('correctPassword')
    const result = await comparePassword('correctPassword', hash)
    expect(result).toBe(true)
  })

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('correctPassword')
    const result = await comparePassword('wrongPassword', hash)
    expect(result).toBe(false)
  })
})
