/**
 * Explicit database release utility.
 *
 * Database changes are deliberately separated from Vercel builds. The default
 * action applies migrations only. Seeding and administrator bootstrap require
 * an explicit command and opt-in environment flag.
 *
 * Usage:
 *   npm run db:deploy                 # migrations only
 *   npm run db:deploy:migrations      # migrations only
 *   LERNIO_ALLOW_DB_SEED=true npm run db:deploy:seed
 *   LERNIO_ALLOW_ADMIN_UPSERT=true npm run db:deploy:admin
 */
import { spawnSync } from 'node:child_process'

const ALLOWED_STEPS = new Set(['migrations', 'seed', 'admin', 'all'])
const step = process.argv[2] ?? 'migrations'

if (!ALLOWED_STEPS.has(step)) {
  console.error(`[db-deploy] Unknown step: ${step}`)
  console.error('Usage: node scripts/db-deploy.mjs [migrations|seed|admin|all]')
  process.exit(1)
}

function executable(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name
}

function runCommand(command, args, env = process.env) {
  process.stdout.write(`[db-deploy] Running: ${command} ${args.join(' ')}\n`)
  const result = spawnSync(executable(command), args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    shell: false,
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function resolveMigrationUrl() {
  const candidates = [
    ['DIRECT_URL', process.env.DIRECT_URL],
    ['DATABASE_URL_UNPOOLED', process.env.DATABASE_URL_UNPOOLED],
    ['POSTGRES_URL_NON_POOLING', process.env.POSTGRES_URL_NON_POOLING],
    ['DATABASE_URL', process.env.DATABASE_URL],
  ]

  for (const [name, value] of candidates) {
    if (!value?.trim()) continue

    let parsed
    try {
      parsed = new URL(value)
    } catch {
      console.error(`[db-deploy] ${name} is not a valid PostgreSQL URL.`)
      process.exit(1)
    }

    if (!/^postgres(?:ql)?:$/i.test(parsed.protocol)) {
      console.error(`[db-deploy] ${name} must use the postgresql:// protocol.`)
      process.exit(1)
    }

    const transactionPooler =
      parsed.port === '6543' || parsed.searchParams.get('pgbouncer') === 'true'
    if (transactionPooler) {
      if (name === 'DATABASE_URL') continue
      console.error(
        `[db-deploy] ${name} points to a transaction pooler. Use a direct or session-pooler URL on port 5432 for migrations.`,
      )
      process.exit(1)
    }

    return { name, value }
  }

  console.error(
    '[db-deploy] No migration-safe database URL is configured. Set DIRECT_URL (preferred), DATABASE_URL_UNPOOLED, or POSTGRES_URL_NON_POOLING.',
  )
  process.exit(1)
}

function migrationEnvironment() {
  const migrationUrl = resolveMigrationUrl()
  process.stdout.write(`[db-deploy] Using ${migrationUrl.name} for Prisma migrations.\n`)
  return {
    ...process.env,
    DATABASE_URL: migrationUrl.value,
    DIRECT_URL: migrationUrl.value,
  }
}

function runMigrations() {
  const env = migrationEnvironment()
  runCommand('npx', ['prisma', 'generate'], env)
  runCommand('npx', ['prisma', 'migrate', 'deploy'], env)
}

function requireOptIn(variable, action) {
  if (process.env[variable] === 'true') return
  console.error(
    `[db-deploy] Refusing ${action}. Set ${variable}=true for this explicit maintenance run.`,
  )
  process.exit(1)
}

function runSeeds() {
  requireOptIn('LERNIO_ALLOW_DB_SEED', 'curriculum seeding')
  runCommand('npx', ['tsx', 'scripts/upsert-cwit-departments.ts'])
  runCommand('npx', ['tsx', 'scripts/import-cwit-source-registry.ts'])
  runCommand('npx', ['tsx', 'scripts/import-curriculum-manifests.ts', '--write'])
  runCommand('npx', ['tsx', 'scripts/publish-curriculum.ts'])
}

function runAdminUpsert() {
  requireOptIn('LERNIO_ALLOW_ADMIN_UPSERT', 'administrator bootstrap')
  if (!process.env.LERNIO_ADMIN_EMAIL || !process.env.LERNIO_ADMIN_PASSWORD) {
    console.error(
      '[db-deploy] LERNIO_ADMIN_EMAIL and LERNIO_ADMIN_PASSWORD are required for administrator bootstrap.',
    )
    process.exit(1)
  }
  runCommand('npx', ['tsx', 'scripts/upsert-admin.ts'])
}

if (step === 'migrations' || step === 'all') runMigrations()
if (step === 'seed' || step === 'all') runSeeds()
if (step === 'admin' || step === 'all') runAdminUpsert()

process.stdout.write('[db-deploy] Done.\n')
