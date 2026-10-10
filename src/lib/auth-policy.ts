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
  if (input.vercelEnv) return input.vercelEnv === 'production'
  return input.nodeEnv === 'production'
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

export function safeCallbackPath(
  value: string | null | undefined,
  fallback = '/dashboard',
  allowedOrigin?: string,
): string {
  if (!value) return fallback
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try {
    const parsed = new URL(value)
    const baseValue = allowedOrigin || process.env.NEXTAUTH_URL
    const base = baseValue ? new URL(baseValue) : null
    if (base && parsed.origin === base.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return fallback
  }
  return fallback
}

const LERNIO_PRODUCTION_ORIGIN = 'https://lernioai.vercel.app'

function httpOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.origin
  } catch {
    return null
  }
}

function vercelHostOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  return httpOrigin(value.includes('://') ? value : `https://${value}`)
}

export function resolveRuntimeAuthUrl(input: {
  configuredUrl?: string
  appUrl?: string
  vercelEnv?: string
  vercelUrl?: string
  vercelProjectProductionUrl?: string
}): string | null {
  const explicitAppOrigin = httpOrigin(input.appUrl)
  if (explicitAppOrigin) return explicitAppOrigin

  const configuredOrigin = httpOrigin(input.configuredUrl)

  if (input.vercelEnv === 'preview') {
    return vercelHostOrigin(input.vercelUrl) ?? configuredOrigin
  }

  if (input.vercelEnv === 'production') {
    // The Vercel project production URL is a generated/legacy hostname and
    // is NOT necessarily the domain students visit. Never derive production
    // credential callback URLs from it or from a stale NEXTAUTH_URL.
    // LERNIO_APP_URL above remains the explicit override for a future domain.
    return LERNIO_PRODUCTION_ORIGIN
  }

  return configuredOrigin
}

export function safeAuthRedirect(input: {
  url: string
  baseUrl: string
  canonicalUrl?: string | null
  additionalOrigins?: Array<string | null | undefined>
}): string {
  const baseOrigin = httpOrigin(input.baseUrl)
  const canonicalOrigin = httpOrigin(input.canonicalUrl) ?? baseOrigin
  const fallbackOrigin = canonicalOrigin ?? LERNIO_PRODUCTION_ORIGIN
  const trustedOrigins = new Set<string>()
  if (canonicalOrigin) trustedOrigins.add(canonicalOrigin)
  if (baseOrigin && (!canonicalOrigin || baseOrigin === canonicalOrigin)) {
    trustedOrigins.add(baseOrigin)
  }

  for (const candidate of input.additionalOrigins ?? []) {
    const origin = httpOrigin(candidate)
    if (origin) trustedOrigins.add(origin)
  }

  if (input.url.startsWith('/') && !input.url.startsWith('//')) {
    return `${fallbackOrigin}${input.url}`
  }

  try {
    const parsed = new URL(input.url)
    if (trustedOrigins.has(parsed.origin)) return parsed.toString()
  } catch {
    return `${fallbackOrigin}/dashboard`
  }

  return `${fallbackOrigin}/dashboard`
}
