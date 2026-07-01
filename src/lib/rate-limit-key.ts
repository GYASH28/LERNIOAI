import { createHash } from 'crypto'

export function rateLimitKey(action: string, identifier: string): string {
  const normalized = `${action}:${identifier.trim().toLowerCase()}`
  return createHash('sha256').update(normalized).digest('hex')
}
