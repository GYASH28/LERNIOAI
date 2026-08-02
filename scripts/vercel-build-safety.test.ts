import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const buildScript = readFileSync(
  new URL('./vercel-build.mjs', import.meta.url),
  'utf8',
)

describe('Vercel build safety', () => {
  it('does not apply migrations or synchronize the live schema', () => {
    expect(buildScript).not.toContain("['prisma', 'migrate', 'deploy']")
    expect(buildScript).not.toContain("['prisma', 'db', 'push'")
    expect(buildScript).not.toContain('--accept-data-loss')
  })

  it('does not seed curriculum data or bootstrap administrators', () => {
    expect(buildScript).not.toContain('scripts/upsert-admin.ts')
    expect(buildScript).not.toContain('scripts/upsert-cwit-departments.ts')
    expect(buildScript).not.toContain('scripts/import-curriculum-manifests.ts')
    expect(buildScript).not.toContain('scripts/publish-curriculum.ts')
  })

  it('still generates Prisma Client and performs the application build', () => {
    expect(buildScript).toContain("['prisma', 'generate']")
    expect(buildScript).toContain("['next', 'build']")
  })
})
