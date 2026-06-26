import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

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

function stripUtf8BomFromMigrations() {
  const migrationsDirectory = resolve(process.cwd(), 'prisma/migrations')
  if (!existsSync(migrationsDirectory)) return

  for (const entry of readdirSync(migrationsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const migrationPath = join(migrationsDirectory, entry.name, 'migration.sql')
    if (!existsSync(migrationPath)) continue

    const sql = readFileSync(migrationPath, 'utf8')
    if (sql.charCodeAt(0) === 0xfeff) {
      writeFileSync(migrationPath, sql.slice(1), 'utf8')
      console.log(`[vercel-build] Removed UTF-8 BOM from ${entry.name}/migration.sql`)
    }
  }
}

stripUtf8BomFromMigrations()

console.log('[vercel-build] Generating Prisma Client...')
runCli('node_modules/prisma/build/index.js', ['generate'])

const pooledDatabaseUrl = process.env.DATABASE_URL?.trim()
const migrationDatabaseUrl =
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.DIRECT_URL?.trim() ||
  pooledDatabaseUrl

if (pooledDatabaseUrl && migrationDatabaseUrl) {
  const databaseEnv = {
    ...process.env,
    DATABASE_URL: migrationDatabaseUrl,
  }

  console.log('[vercel-build] Database configured; applying committed Prisma migrations...')
  runCli(
    'node_modules/prisma/build/index.js',
    ['migrate', 'deploy'],
    databaseEnv,
  )

  const adminEmail = process.env.LERNIO_ADMIN_EMAIL?.trim()
  const adminPassword = process.env.LERNIO_ADMIN_PASSWORD?.trim()
  if (adminEmail && adminPassword) {
    console.log('[vercel-build] Admin bootstrap configured; creating or repairing the admin account...')
    runCli(
      'node_modules/tsx/dist/cli.mjs',
      ['scripts/upsert-admin.ts'],
      databaseEnv,
    )
  } else {
    console.warn('[vercel-build] Admin bootstrap skipped because LERNIO_ADMIN_EMAIL or LERNIO_ADMIN_PASSWORD is missing.')
  }
} else {
  console.warn('[vercel-build] DATABASE_URL is not configured; skipping migrations and admin bootstrap.')
}

console.log('[vercel-build] Building Next.js...')
runCli('node_modules/next/dist/bin/next', ['build'])
