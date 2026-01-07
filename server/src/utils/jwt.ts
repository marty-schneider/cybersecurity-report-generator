import jwt, { SignOptions } from 'jsonwebtoken'

interface TokenPayload {
  id: string
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  }
  return jwt.sign(payload, process.env.JWT_SECRET!, options)
}

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
}
