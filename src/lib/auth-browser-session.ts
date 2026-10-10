/**
 * Verify the authentication cookie on the CURRENT browser origin.
 * /api/user loads the whole Prisma profile and can return a transient 5xx
 * even after NextAuth has successfully established a session.
 */
export interface ConfirmedBrowserSession {
  id: string
  email: string
  role: string
}

export async function confirmBrowserSession(
  expectedEmail: string,
): Promise<ConfirmedBrowserSession | null> {
  const normalizedEmail = expectedEmail.trim().toLowerCase()
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (response.ok) {
        const payload = await response.json() as {
          user?: { id?: unknown; email?: unknown; role?: unknown }
        }
        const user = payload?.user
        if (
          typeof user?.id === 'string' &&
          user.id.length > 0 &&
          user.id !== 'undefined' &&
          typeof user.email === 'string' &&
          user.email.trim().toLowerCase() === normalizedEmail
        ) {
          return {
            id: user.id,
            email: user.email,
            role: typeof user.role === 'string' ? user.role : 'student',
          }
        }
      }
    } catch {
      // A brief network error immediately after the login response can be
      // transient; retry once rather than presenting a false password error.
    }
    if (attempt === 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, 200))
    }
  }
  return null
}
