import { afterEach, describe, expect, it } from 'vitest'
import { normalizeRuntimeDatabaseUrl } from './db'

const originalEnvironment = {
  PRISMA_CONNECT_TIMEOUT_SECONDS: process.env.PRISMA_CONNECT_TIMEOUT_SECONDS,
  PRISMA_POOL_TIMEOUT_SECONDS: process.env.PRISMA_POOL_TIMEOUT_SECONDS,
  PRISMA_CONNECTION_LIMIT: process.env.PRISMA_CONNECTION_LIMIT,
}

afterEach(() => {
  restoreEnvironment(
    'PRISMA_CONNECT_TIMEOUT_SECONDS',
    originalEnvironment.PRISMA_CONNECT_TIMEOUT_SECONDS,
  )
  restoreEnvironment(
    'PRISMA_POOL_TIMEOUT_SECONDS',
    originalEnvironment.PRISMA_POOL_TIMEOUT_SECONDS,
  )
  restoreEnvironment(
    'PRISMA_CONNECTION_LIMIT',
    originalEnvironment.PRISMA_CONNECTION_LIMIT,
  )
})

describe('normalizeRuntimeDatabaseUrl', () => {
  it('configures a Supabase transaction pooler for Prisma serverless use', () => {
    const result = normalizeRuntimeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres',
    )
    const url = new URL(result!)

    expect(url.searchParams.get('pgbouncer')).toBe('true')
    expect(url.searchParams.get('connection_limit')).toBe('1')
    expect(url.searchParams.get('connect_timeout')).toBe('10')
    expect(url.searchParams.get('pool_timeout')).toBe('10')
  })

  it('does not mark a direct or session-pooler URL as PgBouncer transaction mode', () => {
    const result = normalizeRuntimeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:5432/postgres',
    )
    const url = new URL(result!)

    expect(url.searchParams.has('pgbouncer')).toBe(false)
    expect(url.searchParams.has('connection_limit')).toBe(false)
  })

  it('preserves explicitly configured connection settings', () => {
    const result = normalizeRuntimeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=4&connect_timeout=20&pool_timeout=30',
    )
    const url = new URL(result!)

    expect(url.searchParams.get('connection_limit')).toBe('4')
    expect(url.searchParams.get('connect_timeout')).toBe('20')
    expect(url.searchParams.get('pool_timeout')).toBe('30')
  })

  it('leaves non-PostgreSQL and malformed values unchanged', () => {
    expect(normalizeRuntimeDatabaseUrl('file:./dev.db')).toBe('file:./dev.db')
    expect(normalizeRuntimeDatabaseUrl('postgresql://not a url')).toBe(
      'postgresql://not a url',
    )
  })
})

function restoreEnvironment(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key]
  else process.env[key] = value
}
