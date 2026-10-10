/**
 * Minimal, non-sensitive deployment metadata that helps detect when a
 * canonical domain is still serving an obsolete Vercel commit. No token,
 * database status, username, or configuration value is exposed.
 */
export function getReleaseInfo(env: {
  VERCEL_GIT_COMMIT_SHA?: string
  VERCEL_ENV?: string
  NODE_ENV?: string
}) {
  const candidate = env.VERCEL_GIT_COMMIT_SHA?.trim().toLowerCase() ?? ''
  return {
    app: 'lernio',
    revision: /^[a-f0-9]{40}$/.test(candidate) ? candidate : null,
    stage: env.VERCEL_ENV === 'production' ? 'production'
      : env.VERCEL_ENV === 'preview' ? 'preview'
      : 'local',
  } as const
}
