import { okResponse, requireRole, withApi } from '@/lib/auth'
import { getCodeRunnerConfig } from '@/lib/coding/code-runner'
import { isEmailConfigured } from '@/lib/email'
import { isStorageConfigured } from '@/lib/storage/signed-object-url'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/health
 *
 * Returns the configuration status of every optional-infrastructure system
 * the deployment depends on. This is the admin-facing source of truth for
 * "what's wired up on this deployment right now" — it reads the same env-var
 * checks the runtime code uses, so there is a single source of truth.
 *
 * Requires admin role. The response is intentionally limited to boolean
 * configured/not-configured flags plus a short, human-readable explanation
 * of what each system affects — no secrets, no key material, no URLs.
 */
export function GET() {
  return withApi(async () => {
    await requireRole('admin')

    const codeRunner = getCodeRunnerConfig()
    const email = isEmailConfigured()
    const storage = isStorageConfigured()
    const groq = Boolean(process.env.GROQ_API_KEY?.trim())
    const googleOauth = Boolean(
      process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim(),
    )

    return okResponse({
      services: {
        codeRunner: {
          configured: codeRunner.configured,
          reason: codeRunner.configured ? null : codeRunner.reason,
          affects: 'C++ playground execution and graded coding challenge submissions.',
        },
        email: {
          configured: email,
          affects: 'Email verification, password resets, and weekly parent reports.',
        },
        storage: {
          configured: storage,
          affects: 'Generated lesson note PDF/HTML downloads.',
        },
        groq: {
          configured: groq,
          affects: 'AI tutor (LEO), AI-powered lesson notes generation, and the AI planner.',
        },
        googleOauth: {
          configured: googleOauth,
          affects: 'Sign in with Google. Email/password sign-in is always available.',
        },
      },
    })
  })
}
