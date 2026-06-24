const DATABASE_UNAVAILABLE_NAMES = new Set([
  'PrismaClientInitializationError',
  'PrismaClientUnknownRequestError',
])

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const candidate = err as { name?: string; code?: string; message?: string }
  if (candidate.code === 'P1001') return true
  if (candidate.name && DATABASE_UNAVAILABLE_NAMES.has(candidate.name)) return true

  return /can't reach database server|database server.*not reachable/i.test(
    candidate.message ?? '',
  )
}
