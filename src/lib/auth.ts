/**
 * Server-only authentication & authorization helper.
 *
 * ENVIRONMENT NOTE:
 * This sandbox has no real OAuth provider, so we implement a single audited
 * `requireUser()` helper that resolves the active user. In demo mode (default),
 * it resolves the seeded demo student through ONE central place — eliminating
 * the scattered hardcoded `student@lernio.ai` queries. In production, swap the
 * body of `resolveUserFromSession()` for a verified NextAuth/credentials session.
 *
 * Trust boundary: every API route MUST call requireUser() / requireRole().
 * Never accept a userId from the browser.
 */
import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { resolveAuthMode } from '@/lib/auth-policy'
import { DEMO_AUTH_USER } from '@/lib/demo-fixtures'

export type Role = 'student' | 'cr' | 'teacher' | 'coordinator' | 'moderator' | 'reviewer' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  status?: string
  profileComplete?: boolean
}

const DEMO_PASSWORD = process.env.LERNIO_DEMO_PASSWORD || 'student123'
const MAX_LOGIN_ATTEMPTS = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000
const loginAttempts = new Map<string, { count: number; resetAt: number }>()

function normalizeEmail(email: string | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

function normalizeRole(role: unknown): Role {
  const normalized = String(role || 'student').trim().toLowerCase()
  return ['student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'].includes(normalized)
    ? (normalized as Role)
    : 'student'
}

function isLoginBlocked(key: string): boolean {
  const attempt = loginAttempts.get(key)
  if (!attempt) return false
  if (Date.now() > attempt.resetAt) {
    loginAttempts.delete(key)
    return false
  }
  return attempt.count >= MAX_LOGIN_ATTEMPTS
}

function recordFailedLogin(key: string) {
  const now = Date.now()
  const current = loginAttempts.get(key)
  if (!current || now > current.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS })
    return
  }
  loginAttempts.set(key, { count: current.count + 1, resetAt: current.resetAt })
}

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    name: 'Email and password',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const email = normalizeEmail(credentials?.email)
      const password = credentials?.password
      if (!email || !password || password.length > 256) return null

      const attemptKey = `credentials:${email}`
      if (isLoginBlocked(attemptKey)) return null

      if (
        process.env.LERNIO_DEMO_MODE === 'true' &&
        email === DEMO_AUTH_USER.email &&
        password === DEMO_PASSWORD
      ) {
        loginAttempts.delete(attemptKey)
        return DEMO_AUTH_USER
      }

      const user = await db.user.findUnique({ where: { email } })
      if (!user?.passwordHash || user.status === 'disabled') {
        recordFailedLogin(attemptKey)
        return null
      }

      const valid = await compare(password, user.passwordHash)
      if (!valid) {
        recordFailedLogin(attemptKey)
        return null
      }

      loginAttempts.delete(attemptKey)
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRole(user.role),
        status: user.status,
        profileComplete: user.profileComplete,
      }
    },
  }),
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  )
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/sign-in',
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return true
      const existing = await db.user.findUnique({
        where: { email: user.email },
        select: { status: true },
      })
      return existing?.status !== 'disabled'
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = normalizeRole((user as AuthUser).role)
        token.status = (user as AuthUser).status ?? 'active'
        token.profileComplete = (user as AuthUser).profileComplete ?? true
      } else if (token.email && (!token.id || !token.role || !token.status || token.profileComplete === undefined)) {
        const fresh = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true, profileComplete: true },
        })
        if (fresh) {
          token.id = fresh.id
          token.role = normalizeRole(fresh.role)
          token.status = fresh.status
          token.profileComplete = fresh.profileComplete
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id)
        session.user.role = normalizeRole(token.role)
        session.user.status = String(token.status ?? 'active')
        session.user.profileComplete = token.profileComplete !== false
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: {
          role: 'student',
          status: 'active',
          provider: 'oauth',
          profileComplete: false,
        },
      })
    },
  },
}

/**
 * Resolve the authenticated user from a verified server session.
 *
 * Production implementation (documented):
 *   const session = await getServerSession(authOptions)
 *   if (!session?.user?.email) return null
 *   return db.user.findUnique({ where: { email: session.user.email } })
 *
 * Sandbox/demo implementation: resolves the demo user when LERNIO_DEMO_MODE === 'true'.
 * When LERNIO_DEMO_MODE=false and no session exists, returns null (unauthenticated).
 */
async function resolveUserFromSession(): Promise<AuthUser | null> {
  if (process.env.LERNIO_DEMO_MODE === 'true') {
    return DEMO_AUTH_USER
  }

  const session = await getServerSession(authOptions)
  const authMode = resolveAuthMode({
    demoModeEnv: process.env.LERNIO_DEMO_MODE,
    sessionEmail: session?.user?.email,
  })

  if (authMode.mode === 'session') {
    const u = await db.user.findUnique({ where: { email: authMode.email } })
    if (!u || u.status === 'disabled') return null
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: normalizeRole(u.role),
      status: u.status,
      profileComplete: u.profileComplete,
    }
  }

  if (authMode.mode === 'demo') {
    return DEMO_AUTH_USER
  }

  return null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return resolveUserFromSession()
}

/**
 * Require an authenticated user. Throws an ApiError (401) if none.
 */
export async function requireUser(): Promise<AuthUser> {
  const user = await resolveUserFromSession()
  if (!user) {
    throw new ApiError('UNAUTHENTICATED', 'Please sign in to continue.', 401, false)
  }
  return user
}

/**
 * Require a user with one of the allowed roles. Throws ApiError (403) otherwise.
 */
export async function requireRole(...allowed: Role[]): Promise<AuthUser> {
  const user = await requireUser()
  if (!allowed.includes(user.role)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do that.', 403, false)
  }
  return user
}

export const requireStudent = () => requireRole('student', 'cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin')
export const requireTeacher = () => requireRole('teacher', 'coordinator', 'admin')
export const requireModerator = () => requireRole('moderator', 'reviewer', 'coordinator', 'admin')
export const requireReviewer = () => requireRole('reviewer', 'admin')
export const requireAdmin = () => requireRole('admin')

/**
 * Standardised API error with safe user message + code + retryability.
 * Never leak internal error strings to the client.
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public safeMessage: string,
    public status: number = 500,
    public retryable: boolean = true,
    public requestId?: string,
  ) {
    super(safeMessage)
    this.name = 'ApiError'
  }

  toJSON() {
    return {
      ok: false,
      error: {
        code: this.code,
        message: this.safeMessage,
        retryable: this.retryable,
      },
      requestId: this.requestId ?? crypto.randomUUID(),
    }
  }
}

/**
 * Wrap an async API handler with standard error handling.
 * Catches ApiError and unexpected errors, always returning a safe JSON Response.
 */
export async function withApi(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler()
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * Safely convert any thrown error into an ApiError JSON response.
 */
export function errorResponse(err: unknown, status = 500) {
  if (err instanceof ApiError) {
    return Response.json(err.toJSON(), { status: err.status })
  }
  if (isDatabaseUnavailableError(err)) {
    console.warn('[api] database unavailable')
    const apiError = new ApiError(
      'DATABASE_UNAVAILABLE',
      'The database is unavailable. Please check the PostgreSQL connection and try again.',
      503,
      true,
    )
    return Response.json(apiError.toJSON(), { status: apiError.status })
  }
  console.error('[api] unhandled error:', err)
  const requestId = crypto.randomUUID()
  return Response.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our end. Please try again.',
        retryable: true,
      },
      requestId,
    },
    { status },
  )
}

/**
 * Standard success response shape.
 */
export function okResponse<T>(data: T) {
  return Response.json({ ok: true, data, requestId: crypto.randomUUID() })
}
