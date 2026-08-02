import net from 'node:net'

interface CachedProbe {
  checkedAt: number
  reachable: boolean
}

let cachedProbe: CachedProbe | null = null

export async function canAttemptDatabase(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) return true
  if (process.env.DATABASE_TCP_PROBE_DISABLED === 'true') return true

  const now = Date.now()
  if (cachedProbe) {
    const cacheMs = cachedProbe.reachable
      ? readPositiveInt(process.env.DATABASE_REACHABILITY_CACHE_MS, 5_000)
      : readPositiveInt(process.env.DATABASE_FAILURE_CACHE_MS, 1_000)
    if (now - cachedProbe.checkedAt < cacheMs) return cachedProbe.reachable
  }

  const reachable = await probeTcp(databaseUrl)
  cachedProbe = { checkedAt: now, reachable }
  return reachable
}

function probeTcp(databaseUrl: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    return Promise.resolve(true)
  }

  const host = parsed.hostname
  const port = Number(parsed.port || 5432)
  if (!host || !Number.isFinite(port)) return Promise.resolve(true)

  const timeoutMs = readPositiveInt(
    process.env.DATABASE_TCP_PROBE_TIMEOUT_MS,
    1_500,
  )

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    let settled = false

    const finish = (reachable: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(reachable)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

function readPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}
