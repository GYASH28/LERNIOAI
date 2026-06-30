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

console.log('[vercel-build] Building Next.js...')
runCommand('npx', ['next', 'build', '--webpack'])
