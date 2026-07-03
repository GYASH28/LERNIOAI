import jwt from 'jsonwebtoken'

export async function signJwt(payload: {
  id: string
  email: string
  name: string
  role: string
  status: string
  profileComplete: boolean
  authorityVersion: number
}): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET is not set')
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      ...payload,
      iat: now,
      exp: now + 30 * 24 * 60 * 60,
      authIssuedAt: Date.now(),
      authorityCheckedAt: Date.now(),
      sessionRevoked: false,
    },
    secret,
    { algorithm: 'HS256' },
  )
}
