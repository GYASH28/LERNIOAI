import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const datasourceUrl = withConnectionTimeouts(process.env.DATABASE_URL)
  return new PrismaClient({
    log: ['error', 'warn'],
    ...(datasourceUrl ? { datasourceUrl } : {}),
  })
}

function withConnectionTimeouts(value: string | undefined): string | undefined {
  if (!value || !/^postgres(?:ql)?:\/\//i.test(value)) return value

  try {
    const url = new URL(value)
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', process.env.PRISMA_CONNECT_TIMEOUT_SECONDS || '2')
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT_SECONDS || '2')
    }
    return url.toString()
  } catch {
    return value
  }
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
