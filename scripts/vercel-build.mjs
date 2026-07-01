/**
 * Audit fix #35 (CVSS 3.8): separated DB mutations out of the Vercel build.
 *
 * Previously this script ran 8 destructive steps in order: prisma generate,
 * prisma migrate deploy, dept upsert, source registry import, curriculum
 * import --write, publish-curriculum, upsert-admin, then `next build`.
 * Steps 2-7 mutated the production database on every Vercel build, and
 * a failed build midway through left the DB in a partially-migrated state.
 *
 * Now this script only runs:
 *   1. `prisma generate` (safe; only generates client code)
 *   2. `next build` (the actual build)
 *
 * DB migrations and seed scripts have been moved to `scripts/db-deploy.mjs`,
 * which should be run manually (or via a GitHub Action on release) AFTER
 * a successful build.
 *
 * If you need the old behaviour (e.g. for a preview env that auto-migrates),
 * set the env var `LERNIO_AUTO_MIGRATE=true` and the migrate/seed steps
 * will run before the build. This is NOT recommended for production.
 */
import { spawnSync } from 'node:child_process'

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  console.error('[vercel-build] Refusing production build with LERNIO_DEMO_MODE=true.')
  process.exit(1)
}

function runCommand(cmd, args) {
  console.log(`[vercel-build] Running: ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[vercel-build] Generating Prisma Client...')
runCommand('npx', ['prisma', 'generate'])

// DB migrations and seed steps are opt-in via LERNIO_AUTO_MIGRATE=true.
const autoMigrate = process.env.LERNIO_AUTO_MIGRATE === 'true'
const isProduction = process.env.VERCEL_ENV === 'production'

if (autoMigrate && !isProduction) {
  console.log('[vercel-build] LERNIO_AUTO_MIGRATE=true (non-production) — running DB seed steps...')

  console.log('[vercel-build] Running Prisma migrations...')
  runCommand('npx', ['prisma', 'migrate', 'deploy'])

  console.log('[vercel-build] Seeding CWIT departments...')
  runCommand('npx', ['tsx', 'scripts/upsert-cwit-departments.ts'])

  console.log('[vercel-build] Seeding CWIT sources...')
  runCommand('npx', ['tsx', 'scripts/import-cwit-source-registry.ts'])

  console.log('[vercel-build] Importing curriculum manifests...')
  runCommand('npx', ['tsx', 'scripts/import-curriculum-manifests.ts', '--write'])

  console.log('[vercel-build] Publishing curriculum and migrating users...')
  runCommand('npx', ['tsx', 'scripts/publish-curriculum.ts'])

  console.log('[vercel-build] Setting up default admin user...')
  runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'])
} else if (autoMigrate && isProduction) {
  console.error(
    '[vercel-build] LERNIO_AUTO_MIGRATE=true is set but VERCEL_ENV=production. ' +
      'Refusing to auto-migrate production DB during build. ' +
      'Run `npm run db:deploy` manually after the build succeeds.',
  )
  process.exit(1)
} else {
  console.log(
    '[vercel-build] Skipping DB migrations and seed steps. ' +
      'Run `npm run db:deploy` manually after a successful build to apply migrations and seed data.',
  )
}

console.log('[vercel-build] Building Next.js...')
runCommand('npx', ['next', 'build', '--webpack'])
