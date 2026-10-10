/**
 * Validates the identity embedded in a NextAuth session before any API or
 * protected route treats it as an authenticated student.
 * JWT callbacks can stringify missing fields (e.g. "undefined"). Such
 * sessions must not count as authenticated, or generate a login redirect loop.
 */
export interface ActiveSessionIdentity {
  id: string
  email: string
  role?: string
  status?: string
  sessionRevoked?: boolean
}

export function isActiveSessionIdentity(value: unknown): value is ActiveSessionIdentity {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  const id = user.id
  const email = user.email
  const status = user.status

  return (
    typeof id === 'string' &&
    id.trim().length > 0 &&
    id !== 'undefined' &&
    id !== 'null' &&
    typeof email === 'string' &&
    email.trim().length > 3 &&
    email.includes('@') &&
    user.sessionRevoked !== true &&
    status !== 'revoked' &&
    status !== 'disabled'
  )
}
