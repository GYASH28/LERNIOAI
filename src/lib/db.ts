import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function normalizeRuntimeDatabaseUrl(
  value: string | undefined,
): string | undefined {
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) return value

  try {
    const url = new URL(value)
    const supabaseTransactionPooler =
      url.hostname.endsWith('.pooler.supabase.com') && url.port === '6543'

    if (supabaseTransactionPooler) {
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true')
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set(
          'connection_limit',
          process.env.PRISMA_CONNECTION_LIMIT || '1',
        )
      }
    }

    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set(
        'connect_timeout',
        process.env.PRISMA_CONNECT_TIMEOUT_SECONDS || '10',
      )
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set(
        'pool_timeout',
        process.env.PRISMA_POOL_TIMEOUT_SECONDS || '10',
      )
    }

    return url.toString()
  } catch {
    return value
  }
}

function createPrismaClient() {
  const datasourceUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL)
  return new PrismaClient({
    log: ['error', 'warn'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })
}

export function getDb() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb()
    const value = Reflect.get(client, prop, receiver)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
