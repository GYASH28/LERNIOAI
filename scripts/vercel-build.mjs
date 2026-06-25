import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

function runCli(relativeCliPath, args, env = process.env) {
  const cliPath = resolve(process.cwd(), relativeCliPath)
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('[vercel-build] Generating Prisma Client...')
runCli('node_modules/prisma/build/index.js', ['generate'])

const pooledDatabaseUrl = process.env.DATABASE_URL?.trim()
const migrationDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.DIRECT_URL?.trim() ||
  pooledDatabaseUrl

if (pooledDatabaseUrl && migrationDatabaseUrl) {
  console.log('[vercel-build] Database configured; applying committed Prisma migrations...')
  runCli(
    'node_modules/prisma/build/index.js',
    ['migrate', 'deploy'],
    {
      ...process.env,
      // Use Neon's direct/unpooled URL for migration advisory locks when it is
      // available, while the deployed application continues using DATABASE_URL.
      DATABASE_URL: migrationDatabaseUrl,
    },
  )
} else {
  console.warn(
    '[vercel-build] DATABASE_URL is not configured for this Vercel project; skipping migrations.',
  )
}

console.log('[vercel-build] Building Next.js...')
runCli('node_modules/next/dist/bin/next', ['build'])
