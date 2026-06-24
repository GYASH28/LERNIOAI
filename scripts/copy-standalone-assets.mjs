import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const standaloneDir = join(root, '.next', 'standalone')

if (existsSync(standaloneDir)) {
  const standaloneNextDir = join(standaloneDir, '.next')
  mkdirSync(standaloneNextDir, { recursive: true })

  const staticDir = join(root, '.next', 'static')
  if (existsSync(staticDir)) {
    cpSync(staticDir, join(standaloneNextDir, 'static'), { recursive: true })
  }

  const publicDir = join(root, 'public')
  if (existsSync(publicDir)) {
    cpSync(publicDir, join(standaloneDir, 'public'), { recursive: true })
  }
}
