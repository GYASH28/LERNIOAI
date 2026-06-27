export type AuthMode =
  | { mode: 'demo' }
  | { mode: 'session'; email: string }
  | { mode: 'unauthenticated' }

export interface AuthModeInput {
  demoModeEnv: string | undefined
  sessionEmail: string | null | undefined
}

export interface RuntimeSafetyInput {
  demoModeEnv?: string
  nodeEnv?: string
  vercelEnv?: string
}

export function isProductionRuntime(input: RuntimeSafetyInput): boolean {
  return input.nodeEnv === 'production' || input.vercelEnv === 'production'
}

export function assertSafeRuntimeConfig(input: RuntimeSafetyInput): void {
  if (input.demoModeEnv === 'true' && isProductionRuntime(input)) {
    throw new Error('LERNIO_DEMO_MODE must never be enabled in production.')
  }
}

export function resolveAuthMode(input: AuthModeInput): AuthMode {
  if (input.sessionEmail) {
    return { mode: 'session', email: input.sessionEmail }
  }

  if (input.demoModeEnv === 'true') {
    return { mode: 'demo' }
  }

  return { mode: 'unauthenticated' }
}

export function safeCallbackPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const parsed = new URL(value)
    const base = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL) : null
    if (base && parsed.origin === base.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return fallback
  }
  return fallback
}
