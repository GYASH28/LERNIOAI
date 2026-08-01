import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('page contract audit', () => {
  it('discovers App Router pages on the current operating system', () => {
    const result = spawnSync(process.execPath, ['scripts/audit-page-contracts.mjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    const output = `${result.stdout}\n${result.stderr}`
    const match = output.match(/Page contract audit: (\d+) pages/)

    expect(match).not.toBeNull()
    expect(Number(match?.[1] ?? 0)).toBeGreaterThan(0)
  })
})
