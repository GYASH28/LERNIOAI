import { hash } from 'bcryptjs'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { join } from 'node:path'
import { db } from '../src/lib/db'

function loadEnvFileIfNeeded() {
  const envPath = join(process.cwd(), '.env')
  if (!existsSync(envPath)) return

  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function canReachDatabase(databaseUrl: string | undefined): Promise<boolean> {
  if (!databaseUrl || !/^postgres(?:ql)?:\/\//i.test(databaseUrl)) return Promise.resolve(true)

  let parsed: URL
  try {
    parsed = new URL(databaseUrl)
  } catch {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || 5432),
    })
    let settled = false
    const finish = (reachable: boolean) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(reachable)
    }

    socket.setTimeout(1_000)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function main() {
  loadEnvFileIfNeeded()

  const email = (process.env.LERNIO_ADMIN_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = process.env.LERNIO_ADMIN_PASSWORD

  if (!email) {
    console.log('LERNIO_ADMIN_EMAIL not set — skipping admin creation.')
    return
  }
  if (!password || password.length < 8) {
    console.log('LERNIO_ADMIN_PASSWORD not set or too short — skipping admin creation.')
    return
  }
  if (!(await canReachDatabase(process.env.DATABASE_URL))) {
    console.log('Database not reachable — skipping admin creation.')
    return
  }

  const passwordHash = await hash(password, 12)
  const admin = await db.user.upsert({
    where: { email },
    update: {
      name: 'Lernio Admin',
      role: 'admin',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      emailVerified: new Date(),
      passwordHash,
    },
    create: {
      email,
      name: 'Lernio Admin',
      role: 'admin',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      emailVerified: new Date(),
      preferredLang: 'en',
      dailyMins: 120,
      xp: 0,
      level: 1,
      streak: 0,
      passwordHash,
    },
    select: {
      email: true,
      role: true,
      status: true,
      profileComplete: true,
    },
  })

  console.log(`Admin ready: ${admin.email} (${admin.role}, ${admin.status})`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
