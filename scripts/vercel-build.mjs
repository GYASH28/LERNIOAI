import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

if (
  process.env.LERNIO_DEMO_MODE === 'true' &&
  process.env.VERCEL_ENV === 'production'
) {
  console.error('[vercel-build] Refusing production build with LERNIO_DEMO_MODE=true.')
  process.exit(1)
}

function runCli(relativeCliPath, args, env = process.env) {
  const cliPath = resolve(process.cwd(), relativeCliPath)
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log('[vercel-build] Generating Prisma Client...')
runCli('node_modules/prisma/build/index.js', ['generate'])

console.log('[vercel-build] Building Next.js...')
runCli('node_modules/next/dist/bin/next', ['build', '--webpack'])
