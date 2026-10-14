import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const releaseScript = readFileSync(join(root, 'scripts/vercel-build.mjs'), 'utf8')
const adminScript = readFileSync(join(root, 'scripts/upsert-admin.ts'), 'utf8')
const auth = readFileSync(join(root, 'src/lib/auth.ts'), 'utf8')

describe('production release safety', () => {
  it('uses tracked migrations instead of forceful Prisma schema pushes', () => {
    expect(releaseScript).not.toMatch(/run\(['"]npx['"],\s*\[['"]prisma['"],\s*['"]db['"],\s*['"]push['"]/)
    expect(releaseScript).toContain("run('npx', ['prisma', 'migrate', 'deploy'])")
    expect(releaseScript).toContain("process.env.VERCEL_ENV === 'production'")
  })

  it('requires explicit opt-in for seeding and administrator mutation', () => {
    expect(releaseScript).toContain("process.env.LERNIO_BOOTSTRAP_SEEDS === 'true'")
    expect(releaseScript).toContain("process.env.LERNIO_UPSERT_ADMIN_ON_DEPLOY === 'true'")
    expect(releaseScript).toContain("state.reason === 'query_failed'")
  })

  it('never resets account passwords during routine deploys or failed logins', () => {
    expect(adminScript).toContain("process.env.LERNIO_ROTATE_ADMIN_PASSWORD === 'true'")
    expect(auth).not.toContain("Admin password reset:")
    expect(auth).not.toContain("Admin auto-fix:")
  })
})
