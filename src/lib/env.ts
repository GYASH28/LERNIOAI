/**
 * Audit fix #16 (CVSS 3.5): centralised env-var validation via Zod.
 *
 * Previously, the application read 25+ env vars ad-hoc via `process.env.X`
 * throughout the codebase, with no central schema. Missing variables
 * failed at runtime with cryptic errors.
 *
 * Usage:
 *   import { env } from '@/lib/env'
 *   const apiKey = env.GROQ_API_KEY  // typed as string | undefined
 */
import 'server-only'
import { z } from 'zod'

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.enum(['production', 'preview', 'development']).optional(),
  LERNIO_DEMO_MODE: z.string().transform((v) => v === 'true').default('false'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),

  // Auth
  NEXTAUTH_SECRET: z.string().min(16, 'NEXTAUTH_SECRET must be at least 16 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // AI (Groq)
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_FAST_MODEL: z.string().default('llama-3.1-8b-instant'),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Admin bootstrap
  LERNIO_ADMIN_EMAIL: z.string().email().optional(),
  LERNIO_ADMIN_PASSWORD: z.string().optional(),

  // Storage
  STORAGE_PUBLIC_BASE_URL: z.string().url().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_SIGNED_URL_SECRET: z.string().optional(),

  // Code runner
  CODE_RUNNER_URL: z.string().url().optional(),
  CODE_RUNNER_TOKEN: z.string().optional(),
  CODE_RUNNER_HMAC_SECRET: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cachedEnv: Env | null = null

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Environment variable validation failed:\n${issues}\n\n` +
        `Check your .env file (or Vercel project settings) and try again.`,
    )
  }
  cachedEnv = result.data
  return cachedEnv
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env]
  },
})
