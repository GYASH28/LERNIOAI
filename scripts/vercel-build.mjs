/**
 * Vercel build script.
 *
 * Runs:
 *   1. `prisma generate` — generates the Prisma Client (always needed)
 *   2. `prisma migrate deploy` — applies pending migrations (idempotent, fast)
 *   3. Seed check — if DB already has departments, skip all seeds (FAST)
 *   4. Seed scripts — only run on first deploy or if DB is empty
 *   5. `next build --webpack` — the actual Next.js build
 *
 * To skip ALL DB setup, set LERNIO_SKIP_DB_SETUP=true.
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

function runCommandCapture(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
    shell: true,
    encoding: 'utf-8',
  })
  return result.stdout?.trim() || ''
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
  console.log('[vercel-build] Running Prisma migrations (idempotent, fast)...')
  runCommand('npx', ['prisma', 'migrate', 'deploy'], { required: false })

  // ─── FAST CHECK: is the DB already seeded? ────────────────────────────
  // On first deploy this runs all seeds (~5 min). On every subsequent
  // deploy it runs ONE count query (~100ms) and skips everything.
  console.log('[vercel-build] Checking if DB is already seeded...')
  const seededCheck = runCommandCapture('npx', ['tsx', 'scripts/db-seeded-check.ts'])
  console.log(`[vercel-build] Seed check result: ${seededCheck}`)

  let alreadySeeded = false
  try {
    const parsed = JSON.parse(seededCheck)
    alreadySeeded = Boolean(parsed.seeded)
  } catch {
    // If the check fails, assume not seeded and run all seeds
  }

  if (alreadySeeded) {
    console.log('[vercel-build] DB already seeded — skipping curriculum seeds. ✅')
    // Always run admin upsert — ensures admin role is correct
    console.log('[vercel-build] Ensuring admin user has correct role...')
    runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'], { required: false })
  } else {
    console.log('[vercel-build] DB not seeded — running seed scripts (this may take a few minutes)...')

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
}

// ─── Step 3: Next.js build ────────────────────────────────────────────────
console.log('[vercel-build] Building Next.js...')
runCommand('npx', ['next', 'build', '--webpack'])
