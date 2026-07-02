/**
 * Vercel build script.
 *
 * Runs:
 *   1. `prisma generate` — generates the Prisma Client (always needed)
 *   2. `prisma migrate deploy` — applies pending migrations (idempotent, safe)
 *   3. Seed scripts — upserts CWIT departments, sources, curriculum, admin
 *   4. `next build --webpack` — the actual Next.js build
 *
 * All DB steps use UPSERT semantics, so they are safe to run on every build.
 * A failed step is logged but does NOT fail the build (the app degrades
 * gracefully — pages load, sign-in shows an error if the DB is broken).
 *
 * To skip DB setup (e.g. for preview branches that share a DB), set
 * `LERNIO_SKIP_DB_SETUP=true`.
 */
import { spawnSync } from 'node:child_process'

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  console.error('[vercel-build] Refusing production build with LERNIO_DEMO_MODE=true.')
  process.exit(1)
}

function runCommand(cmd, args, { required = true } = {}) {
  console.log(`[vercel-build] Running: ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  })

  if (result.error) {
    if (required) throw result.error
    console.warn(`[vercel-build] Warning: ${cmd} ${args.join(' ')} failed but is optional.`)
    return false
  }
  if (result.status !== 0) {
    if (required) process.exit(result.status ?? 1)
    console.warn(`[vercel-build] Warning: ${cmd} ${args.join(' ')} exited with ${result.status} but is optional.`)
    return false
  }
  return true
}

// ─── Step 1: Prisma Client ────────────────────────────────────────────────
console.log('[vercel-build] Generating Prisma Client...')
runCommand('npx', ['prisma', 'generate'])

// ─── Step 2: DB migrations + seeds (skippable) ───────────────────────────
const skipDbSetup = process.env.LERNIO_SKIP_DB_SETUP === 'true'
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)

if (skipDbSetup) {
  console.log('[vercel-build] LERNIO_SKIP_DB_SETUP=true — skipping DB migrations and seeds.')
} else if (!hasDatabaseUrl) {
  console.warn('[vercel-build] DATABASE_URL not set — skipping DB migrations and seeds.')
} else {
  console.log('[vercel-build] Running Prisma migrations (idempotent)...')
  // migrate deploy is idempotent — safe to run on every build
  runCommand('npx', ['prisma', 'migrate', 'deploy'], { required: false })

  console.log('[vercel-build] Seeding CWIT departments (upsert)...')
  runCommand('npx', ['tsx', 'scripts/upsert-cwit-departments.ts'], { required: false })

  console.log('[vercel-build] Seeding CWIT sources (upsert)...')
  runCommand('npx', ['tsx', 'scripts/import-cwit-source-registry.ts'], { required: false })

  console.log('[vercel-build] Importing curriculum manifests (upsert)...')
  runCommand('npx', ['tsx', 'scripts/import-curriculum-manifests.ts', '--write'], { required: false })

  console.log('[vercel-build] Publishing curriculum...')
  runCommand('npx', ['tsx', 'scripts/publish-curriculum.ts'], { required: false })

  console.log('[vercel-build] Setting up default admin user (upsert)...')
  runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'], { required: false })
}

// ─── Step 3: Next.js build ────────────────────────────────────────────────
console.log('[vercel-build] Building Next.js...')
runCommand('npx', ['next', 'build', '--webpack'])
