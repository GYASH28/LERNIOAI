/**
 * Safe Vercel release build.
 *
 * Build should compile the application, not silently alter production data.
 * Production schema changes are applied only through tracked Prisma migrations.
 * Preview builds never write to the production database.
 *
 * Bootstrap actions are explicit opt-ins:
 *   LERNIO_BOOTSTRAP_SEEDS=true         initial curriculum import on production
 *   LERNIO_UPSERT_ADMIN_ON_DEPLOY=true  administrator bootstrap on production
 */
import { spawnSync } from 'node:child_process'

const production = process.env.VERCEL_ENV === 'production'

if (process.env.LERNIO_DEMO_MODE === 'true' && production) {
  throw new Error('LERNIO_DEMO_MODE must never be enabled for production.')
}

function run(command, args, { capture = false } = {}) {
  console.log(`[vercel-build] ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(`${command} ${args.join(' ')} failed (exit ${result.status ?? 'unknown'})`)
  }
  return capture ? (result.stdout || '').trim() : ''
}

run('npx', ['prisma', 'generate'])

if (production) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for a Lernio production build.')
  }

  // Migration failures must block deployment. Never use 'db push' here and
  // especially never enable '--accept-data-loss' in CI or Vercel builds.
  run('npx', ['prisma', 'migrate', 'deploy'])

  if (process.env.LERNIO_BOOTSTRAP_SEEDS === 'true') {
    const raw = run('npx', ['tsx', 'scripts/db-seeded-check.ts'], { capture: true })
    let state
    try {
      state = JSON.parse(raw)
    } catch {
      throw new Error('Seed status could not be verified; refusing database writes.')
    }
    if (state.reason === 'query_failed' || typeof state.seeded !== 'boolean') {
      throw new Error('Seed status query failed; refusing database writes.')
    }
    if (!state.seeded) {
      for (const args of [
        ['tsx', 'scripts/upsert-cwit-departments.ts'],
        ['tsx', 'scripts/import-cwit-source-registry.ts'],
        ['tsx', 'scripts/import-curriculum-manifests.ts', '--write'],
        ['tsx', 'scripts/publish-curriculum.ts'],
      ]) {
        run('npx', args)
      }
    } else {
      console.log('[vercel-build] Curriculum already seeded.')
    }
  } else {
    console.log('[vercel-build] Skipping automatic curriculum seeding.')
  }

  if (process.env.LERNIO_UPSERT_ADMIN_ON_DEPLOY === 'true') {
    run('npx', ['tsx', 'scripts/upsert-admin.ts'])
  } else {
    console.log('[vercel-build] Skipping automatic administrator changes.')
  }
} else {
  console.log('[vercel-build] Non-production build: no database migrations, seeds or admin writes.')
}

run('npx', ['next', 'build'])
