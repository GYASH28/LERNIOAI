/**
 * Database-safe Vercel build.
 *
 * A frontend build must never mutate the production database. In particular,
 * do not run `prisma db push`, seed scripts, or admin bootstrap scripts here.
 * Schema changes are applied separately with `npm run db:deploy:migrations`
 * before production traffic is switched to a release that needs them.
 */
import { spawnSync } from 'node:child_process'

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  console.error('[vercel-build] Refusing production build with LERNIO_DEMO_MODE=true.')
  process.exit(1)
}

function executable(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name
}

function runCommand(command, args) {
  process.stdout.write(`[vercel-build] Running: ${command} ${args.join(' ')}\n`)
  const result = spawnSync(executable(command), args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

process.stdout.write(
  '[vercel-build] Database migrations and seeds are intentionally disabled during builds.\n',
)
runCommand('npx', ['prisma', 'generate'])
runCommand('npx', ['next', 'build'])
