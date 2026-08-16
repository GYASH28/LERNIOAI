/**
 * Lernio production build.
 *
 * Production deploys must never recreate legacy diploma/CWIT curriculum data.
 * Database structure is applied through committed migrations only.
 */
import { spawnSync } from 'node:child_process'

if (process.env.LERNIO_DEMO_MODE === 'true' && process.env.VERCEL_ENV === 'production') {
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
    console.warn(`[vercel-build] Optional command failed: ${cmd} ${args.join(' ')}`)
    return false
  }
  if (result.status !== 0) {
    if (required) process.exit(result.status ?? 1)
    console.warn(`[vercel-build] Optional command exited with ${result.status}: ${cmd} ${args.join(' ')}`)
    return false
  }
  return true
}

console.log('[vercel-build] Generating Prisma Client...')
runCommand('npx', ['prisma', 'generate'])

const skipDbSetup = process.env.LERNIO_SKIP_DB_SETUP === 'true'
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL)

if (skipDbSetup) {
  console.log('[vercel-build] Database setup explicitly skipped.')
} else if (!hasDatabaseUrl) {
  console.warn('[vercel-build] DATABASE_URL not set — skipping migrations.')
} else {
  console.log('[vercel-build] Applying committed database migrations...')
  runCommand('npx', ['prisma', 'migrate', 'deploy'])

  // Admin account maintenance is generic infrastructure and safe to preserve.
  runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'], { required: false })
}

console.log('[vercel-build] Building Next.js...')
runCommand('npx', ['next', 'build'])
