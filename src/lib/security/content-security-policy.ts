export interface ContentSecurityPolicyOptions {
  nonce?: string
  nodeEnv?: string
  storagePublicBaseUrl?: string | null
  allowUnsafeInlineScript?: boolean
}

export function buildContentSecurityPolicy({
  nonce,
  nodeEnv = process.env.NODE_ENV,
  storagePublicBaseUrl = process.env.STORAGE_PUBLIC_BASE_URL,
  allowUnsafeInlineScript = false,
}: ContentSecurityPolicyOptions = {}) {
  const isProduction = nodeEnv === 'production'
  const storageOrigin = safeOrigin(storagePublicBaseUrl)

  const scriptSources = ["'self'"]
  if (nonce) scriptSources.push(`'nonce-${nonce}'`)
  if (allowUnsafeInlineScript && !nonce) scriptSources.push("'unsafe-inline'")
  if (!isProduction) scriptSources.push("'unsafe-eval'")
  scriptSources.push('https://www.youtube.com')

  const imageSources = ["'self'", 'data:', 'blob:', 'https://i.ytimg.com']
  const connectSources = ["'self'"]
  const mediaSources = ["'self'", 'blob:', 'data:']
  const frameSources = ['https://www.youtube-nocookie.com', 'https://www.youtube.com']

  if (storageOrigin) {
    imageSources.push(storageOrigin)
    connectSources.push(storageOrigin)
    mediaSources.push(storageOrigin)
    frameSources.push(storageOrigin)
  }

  if (!isProduction) {
    connectSources.push('http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*')
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imageSources.join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    `media-src ${mediaSources.join(' ')}`,
    `frame-src ${frameSources.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export function safeOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}
