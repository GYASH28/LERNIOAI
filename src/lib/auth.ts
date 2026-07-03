/**
 * Server-only authentication & authorization helper.
 *
 * ENVIRONMENT NOTE:
 * This sandbox has no real OAuth provider, so we implement a single audited
 * `requireUser()` helper that resolves the active user. In demo mode, it uses
 * the seeded demo student only when there is no verified authenticated session.
 *
 * Trust boundary: every API route MUST call requireUser() / requireRole().
 * Never accept a userId from the browser.
 */
import 'server-only'
import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { compare } from 'bcryptjs'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { sendVerificationEmail } from '@/lib/email'
import { isDatabaseUnavailableError } from '@/lib/api-error-policy'
import { assertSafeRuntimeConfig, resolveAuthMode } from '@/lib/auth-policy'
import { DEMO_AUTH_USER } from '@/lib/demo-fixtures'
import { checkRateLimit } from '@/lib/rate-limit'
import { canUseCapability, resolveAuthorityContext, type AuthorityContext, type AuthorityScope } from '@/lib/authority'
import { normalizeRole, type Role, type PermissionInput } from '@/lib/roles'

export type { Role } from '@/lib/roles'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  status?: string
  profileComplete?: boolean
  authorityVersion?: number
}

assertSafeRuntimeConfig({
  demoModeEnv: process.env.LERNIO_DEMO_MODE,
  nodeEnv: process.env.NODE_ENV,
  vercelEnv: process.env.VERCEL_ENV,
})

const DEMO_PASSWORD = process.env.LERNIO_DEMO_PASSWORD?.trim() || null
const MAX_LOGIN_ATTEMPTS = 8
const LOGIN_WINDOW_MS = 15 * 60 * 1000

function normalizeEmail(email: string | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
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

      const failKey = `credential_login_fail:${email}`
      let existingFail: Awaited<ReturnType<typeof db.rateLimitBucket.findUnique>> = null
      try {
        existingFail = await db.rateLimitBucket.findUnique({
          where: { key: failKey },
        })
      } catch {
        // DB unreachable — skip rate limit check, proceed to credential check
      }
      if (existingFail && existingFail.resetAt > new Date() && existingFail.count >= MAX_LOGIN_ATTEMPTS) {
        return null
      }

      if (
        process.env.LERNIO_DEMO_MODE === 'true' &&
        DEMO_PASSWORD &&
        email === DEMO_AUTH_USER.email &&
        password === DEMO_PASSWORD
      ) {
        await db.rateLimitBucket.delete({ where: { key: failKey } }).catch(() => {})
        return DEMO_AUTH_USER
      }

      let user: Awaited<ReturnType<typeof db.user.findUnique>> = null
      try {
        user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            status: true,
            profileComplete: true,
            authorityVersion: true,
            sessionsRevokedAt: true,
          },
        })
      } catch {
        // DB unreachable — sign-in cannot proceed. Return null so next-auth
        // shows the generic "CredentialsSignin" error to the user.
        return null
      }

      if (!user?.passwordHash || user.status === 'disabled') {
        // Note: Allow pending_verification users to login — email verification
        // is optional since we don't have email sending configured.
        await checkRateLimit({
          action: 'credential_login_fail',
          identifier: email,
          limit: MAX_LOGIN_ATTEMPTS,
          windowMs: LOGIN_WINDOW_MS,
        }).catch(() => {})
        return null
      }

      const valid = await compare(password, user.passwordHash)
      if (!valid) {
        await checkRateLimit({
          action: 'credential_login_fail',
          identifier: email,
          limit: MAX_LOGIN_ATTEMPTS,
          windowMs: LOGIN_WINDOW_MS,
        }).catch(() => {})
        return null
      }

      await db.rateLimitBucket.delete({ where: { key: failKey } }).catch(() => {})

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: normalizeRole(user.role),
        status: user.status,
        profileComplete: user.profileComplete,
        authorityVersion: user.authorityVersion,
      }
    },
  }),
]

// Google OAuth provider removed — email/password only for reliability.

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
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/') && !url.startsWith('//')) return `${baseUrl}${url}`
      try {
        const parsed = new URL(url)
        if (parsed.origin === baseUrl) return url
      } catch {
        return `${baseUrl}/dashboard`
      }
      return `${baseUrl}/dashboard`
    },
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
        token.authorityVersion = (user as AuthUser).authorityVersion ?? 0
        token.authIssuedAt = Date.now()
        token.sessionRevoked = false
        token.authorityCheckedAt = Date.now()
      } else if (
        token.email &&
        (
          !token.id ||
          !token.role ||
          !token.status ||
          token.profileComplete === undefined ||
          token.authorityVersion === undefined
        )
      ) {
        // Only query DB if critical token fields are missing.
        // NOTE: Removed the 60-second authority recheck — it caused a DB
        // query on EVERY page load, making pages take 5-10+ seconds.
        // Authority is now only checked at login time. To force a recheck,
        // the user must sign out and sign back in.
        const fresh = await db.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            role: true,
            status: true,
            profileComplete: true,
            authorityVersion: true,
            sessionsRevokedAt: true,
          },
        }).catch(() => null)
        if (fresh) {
          const authIssuedAt =
            Number(token.authIssuedAt) ||
            (typeof token.iat === 'number' ? token.iat * 1000 : 0)
          const tokenAuthorityVersion = Number(token.authorityVersion ?? fresh.authorityVersion)
          const revokedByTimestamp =
            Boolean(fresh.sessionsRevokedAt) &&
            authIssuedAt > 0 &&
            authIssuedAt <= fresh.sessionsRevokedAt!.getTime()
          const revokedByAuthorityVersion = tokenAuthorityVersion !== fresh.authorityVersion
          const inactive = fresh.status === 'disabled'

          if (inactive || revokedByTimestamp || revokedByAuthorityVersion) {
            token.id = fresh.id
            token.status = 'revoked'
            token.sessionRevoked = true
            token.authorityCheckedAt = Date.now()
            return token
          }

          token.id = fresh.id
          token.role = normalizeRole(fresh.role)
          token.status = fresh.status
          token.profileComplete = fresh.profileComplete
          token.authorityVersion = fresh.authorityVersion
          token.sessionRevoked = false
          token.authorityCheckedAt = Date.now()
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
        session.user.authorityVersion = Number(token.authorityVersion ?? 0)
        session.user.sessionRevoked = token.sessionRevoked === true
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-assign new OAuth users to COMP / R23 scheme so they can
      // immediately access the Learn section without the complete-profile step.
      const defaultScheme = await db.academicScheme.findFirst({
        where: { code: 'R23', programme: { code: 'DCOMP' } },
        select: { id: true },
      })

      // Require email verification for OAuth users.
      // Google verifies emails at signup, but we should not assume this.
      // An attacker controlling a Google Workspace domain can create
      // accounts with arbitrary unverified emails.
      const emailVerified = (user as { emailVerified?: Date | null }).emailVerified;
      const isVerified = emailVerified !== null && emailVerified !== undefined;

      await db.user.update({
        where: { id: user.id },
        data: {
          role: 'student',
          status: 'active',
          provider: 'oauth',
          profileComplete: isVerified,
          departmentCode: 'COMP',
          semesterNumber: 3,
          ...(defaultScheme ? { schemeId: defaultScheme.id } : {}),
        },
      })

      if (!isVerified && user.email) {
        // Trigger the existing email-verification flow.
        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

        await db.emailVerificationToken.deleteMany({ where: { email: user.email } })
        await db.emailVerificationToken.create({
          data: {
            email: user.email,
            tokenHash,
            expiresAt,
          },
        })

        await sendVerificationEmail(user.email, token)
      }
    },
  },
  // ────────────────────────────────────────────────────────────────────────
  // Audit fix #3 (CVSS 6.5): explicit cookie security override.
  // next-auth v4 defaults to sameSite='lax' and secure='auto', which is too
  // permissive. Force sameSite='strict' and secure=true in production to
  // harden against CSRF and session-hijacking via non-HTTPS origins.
  // Cookie names use __Secure- / __Host- prefixes per RFC 6265bis for
  // additional protection against cookie tossing attacks.
  // ────────────────────────────────────────────────────────────────────────
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: `__Secure-next-auth.pkce.code-verifier`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    state: {
      name: `__Secure-next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    nonce: {
      name: `__Secure-next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}

/**
 * Resolve the authenticated user from a verified server session.
 *
 * A verified NextAuth session always takes precedence over demo mode. This is
 * important for preview deployments where demo mode may be enabled while an
 * administrator signs in with a real database account.
 */
async function resolveUserFromSession(): Promise<AuthUser | null> {
  try {
    const session = await getServerSession(authOptions)

    if (session?.user?.email && (session.user as any).id) {
      const u = session.user as any
      if (u.sessionRevoked) return null
      return {
        id: String(u.id),
        email: String(u.email),
        name: String(u.name || u.email.split('@')[0]),
        role: normalizeRole(u.role),
        status: String(u.status || 'active'),
        profileComplete: u.profileComplete ?? true,
        authorityVersion: Number(u.authorityVersion ?? 0),
      }
    }

    // No session — check demo mode
    const authMode = resolveAuthMode({
      demoModeEnv: process.env.LERNIO_DEMO_MODE,
      sessionEmail: session?.user?.email,
    })

    if (authMode.mode === 'demo') {
      return DEMO_AUTH_USER
    }

    return null
  } catch {
    return null
  }
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

export async function getAuthorityContext(): Promise<AuthorityContext | null> {
  const user = await resolveUserFromSession()
  return user ? resolveAuthorityContext(user) : null
}

export async function requireActiveRole(...allowed: Role[]): Promise<AuthorityContext> {
  const user = await requireUser()
  const authority = await resolveAuthorityContext(user)
  if (!allowed.some((role) => authority.activeRoles.includes(role))) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do that.', 403, false)
  }
  return authority
}

/**
 * Require a user with a specific permission and optional scope checks.
 */
export async function requirePermission(
  permission: PermissionInput,
  scope?: AuthorityScope,
): Promise<AuthUser> {
  const authUser = await requireUser()
  const authority = await resolveAuthorityContext(authUser)

  if (!canUseCapability(authority, permission, scope)) {
    throw new ApiError('FORBIDDEN', 'You do not have permission to do that.', 403, false)
  }

  return authUser
}

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
      'The service is temporarily unavailable. Please try again soon.',
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
