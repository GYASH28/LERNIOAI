import { createHmac } from 'node:crypto'

const DEFAULT_TTL_SECONDS = 900

export interface SignedObjectUrlInput {
  objectKey: string
  disposition?: 'inline' | 'attachment'
  fileName?: string | null
  now?: Date
  env?: Record<string, string | undefined>
}

/**
 * Returns true only when the storage backend is fully configured to serve
 * signed download URLs — i.e. both `STORAGE_PUBLIC_BASE_URL` (the CDN/origin
 * base) and `STORAGE_SIGNING_SECRET` (the HMAC secret used to sign URLs in
 * production) are set.
 *
 * Callers that need to redirect to a signed object URL should check this
 * BEFORE calling `buildSignedObjectUrl`, so they can return a clear,
 * admin-actionable error to the user instead of letting the underlying
 * `STORAGE_SIGNING_SECRET is required in production.` throw surface as a
 * raw 500.
 */
export function isStorageConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const base = env.STORAGE_PUBLIC_BASE_URL?.trim()
  const secret = env.STORAGE_SIGNING_SECRET?.trim()
  return Boolean(base && secret)
}

export function buildSignedObjectUrl({
  objectKey,
  disposition = 'inline',
  fileName,
  now = new Date(),
  env = process.env,
}: SignedObjectUrlInput): string | null {
  const base = env.STORAGE_PUBLIC_BASE_URL?.trim()
  if (!base) return null

  const normalizedKey = normalizeObjectKey(objectKey)
  if (!normalizedKey) return null

  const url = new URL(encodeObjectKeyPath(normalizedKey), ensureTrailingSlash(base))
  const ttlSeconds = readPositiveInt(env.STORAGE_SIGNED_URL_TTL_SECONDS, DEFAULT_TTL_SECONDS, 60, 86_400)
  const expires = Math.floor(now.getTime() / 1000) + ttlSeconds
  const secret = env.STORAGE_SIGNING_SECRET?.trim()

  url.searchParams.set('expires', String(expires))
  url.searchParams.set('disposition', disposition)
  if (fileName) url.searchParams.set('filename', fileName)

  if (secret) {
    url.searchParams.set('signature', signObjectUrl(url.pathname, expires, disposition, fileName ?? null, secret))
  } else if (env.NODE_ENV === 'production') {
    throw new Error('STORAGE_SIGNING_SECRET is required in production.')
  }

  return url.toString()
}

export function signObjectUrl(
  pathname: string,
  expires: number,
  disposition: string,
  fileName: string | null,
  secret: string,
): string {
  return createHmac('sha256', secret)
    .update([pathname, expires, disposition, fileName ?? ''].join('\n'))
    .digest('hex')
}

function normalizeObjectKey(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
}

function encodeObjectKeyPath(key: string): string {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`
}

function readPositiveInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(max, Math.round(parsed)))
}
