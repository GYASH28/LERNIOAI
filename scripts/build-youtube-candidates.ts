import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')
const result = spawnSync(process.execPath, [tsxCli, 'scripts/import-youtube-guides.ts', '--write', ...process.argv.slice(2)], {
  stdio: 'inherit',
})

if (result.error) {
  throw result.error
}

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
