/**
 * Audit fix #35 (CVSS 3.8): standalone DB deploy script.
 *
 * Runs migrations and seed scripts that previously ran inside `vercel-build.mjs`.
 * Run this manually (or via a GitHub Action on release) AFTER a successful
 * Vercel build completes.
 *
 * Usage:
 *   npm run db:deploy              # migrations + all seed steps
 *   npm run db:deploy:migrations   # migrations only
 *   npm run db:deploy:seed         # seed steps only (assumes migrations already applied)
 */
import { spawnSync } from 'node:child_process'

function runCommand(cmd, args) {
  console.log(`[db-deploy] Running: ${cmd} ${args.join(' ')}`)
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: true,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const step = process.argv[2] ?? 'all'

if (step === 'all' || step === 'migrations') {
  console.log('[db-deploy] Running Prisma migrations...')
  runCommand('npx', ['prisma', 'migrate', 'deploy'])
}

if (step === 'all' || step === 'seed') {
  console.log('[db-deploy] Seeding CWIT departments...')
  runCommand('npx', ['tsx', 'scripts/upsert-cwit-departments.ts'])

  console.log('[db-deploy] Seeding CWIT sources...')
  runCommand('npx', ['tsx', 'scripts/import-cwit-source-registry.ts'])

  console.log('[db-deploy] Importing curriculum manifests...')
  runCommand('npx', ['tsx', 'scripts/import-curriculum-manifests.ts', '--write'])

  console.log('[db-deploy] Publishing curriculum and migrating users...')
  runCommand('npx', ['tsx', 'scripts/publish-curriculum.ts'])

  console.log('[db-deploy] Setting up default admin user...')
  runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'])
}

if (step !== 'all' && step !== 'migrations' && step !== 'seed') {
  console.error(`[db-deploy] Unknown step: ${step}`)
  console.error('Usage: npm run db:deploy [all|migrations|seed]')
  process.exit(1)
}

console.log('[db-deploy] Done.')
