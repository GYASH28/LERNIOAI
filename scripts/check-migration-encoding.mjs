import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const migrationsDirectory = resolve(process.cwd(), 'prisma/migrations')
const failures = []

if (existsSync(migrationsDirectory)) {
  for (const entry of readdirSync(migrationsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue

    const migrationPath = join(migrationsDirectory, entry.name, 'migration.sql')
    if (!existsSync(migrationPath)) continue

    const bytes = readFileSync(migrationPath)
    const hasUtf8Bom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
    if (hasUtf8Bom) {
      failures.push(`${entry.name}/migration.sql contains a UTF-8 BOM`)
    }
  }
}

if (failures.length) {
  console.error('[migration-encoding] Invalid migration encoding:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('[migration-encoding] Migration SQL files are BOM-free.')
