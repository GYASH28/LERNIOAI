import type { BrowserContext, WorkerInfo } from '@playwright/test'
import { hash } from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { db } from '../../../src/lib/db'
import { normalizeRole } from '../../../src/lib/roles'

export interface E2eUser {
  id: string
  email: string
}

const E2E_PASSWORD = 'Lernio-e2e-only-2026'

export async function upsertE2eUser(workerInfo: WorkerInfo, namespace: string): Promise<E2eUser | null> {
  if (!process.env.DATABASE_URL) return null
  const project = workerInfo.project.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const safeNamespace = namespace.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const email = `${safeNamespace}-${project}@e2e.lernio.local`
  const passwordHash = await hash(E2E_PASSWORD, 4)
  const user = await db.user.upsert({
    where: { email },
    create: {
      email,
      emailVerified: new Date(),
      name: 'Lernio E2E Student',
      passwordHash,
      role: 'student',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      onboarded: true,
    },
    update: {
      passwordHash,
      status: 'active',
      profileComplete: true,
    },
  })
  return { id: user.id, email: user.email }
}

export async function addE2eSession(context: BrowserContext, user: E2eUser | null) {
  if (!user) return
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id } })
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET || 'ci-secret-replace-in-production',
    maxAge: 60 * 60,
    token: {
      id: record.id,
      sub: record.id,
      email: record.email,
      name: record.name,
      role: normalizeRole(record.role),
      status: record.status,
      profileComplete: record.profileComplete,
      authorityVersion: record.authorityVersion,
      authIssuedAt: Date.now(),
      sessionRevoked: false,
    },
  })
  await context.addCookies([{
    name: 'next-auth.session-token',
    value: token,
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])
}

export async function removeE2eUser(user: E2eUser | null) {
  if (user) await db.user.deleteMany({ where: { id: user.id } })
}
