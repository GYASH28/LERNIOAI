import { spawn } from 'node:child_process'
import process from 'node:process'

const PORT = Number(process.env.STRESS_PORT || 3100)
const BASE_URL = process.env.STRESS_BASE_URL || `http://127.0.0.1:${PORT}`
const SHOULD_SPAWN = !process.env.STRESS_BASE_URL
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY || 16)
const REQUESTS_PER_TARGET = Number(process.env.STRESS_REQUESTS_PER_TARGET || 120)
const MAX_ERROR_RATE = Number(process.env.STRESS_MAX_ERROR_RATE || 0.01)
const MAX_P95_MS = Number(process.env.STRESS_MAX_P95_MS || 1800)

const targets = [
  '/',
  '/sign-in',
  '/api/health',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

function percentile(values, ratio) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))
  return sorted[index]
}

async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`, { redirect: 'follow' })
      if (response.status < 500) return
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Stress server did not become ready: ${lastError ?? 'timeout'}`)
}

async function runTarget(pathname) {
  const durations = []
  let completed = 0
  let failed = 0
  let nextIndex = 0

  async function worker() {
    while (true) {
      const current = nextIndex++
      if (current >= REQUESTS_PER_TARGET) return
      const started = performance.now()
      try {
        const response = await fetch(`${BASE_URL}${pathname}`, {
          redirect: 'follow',
          headers: { 'user-agent': 'lernio-ci-stress/1.0' },
        })
        await response.arrayBuffer()
        if (response.status >= 500) failed += 1
      } catch {
        failed += 1
      } finally {
        durations.push(performance.now() - started)
        completed += 1
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

  const errorRate = completed === 0 ? 1 : failed / completed
  return {
    pathname,
    completed,
    failed,
    errorRate,
    p50: percentile(durations, 0.5),
    p95: percentile(durations, 0.95),
    p99: percentile(durations, 0.99),
  }
}

async function main() {
  let server = null
  if (SHOULD_SPAWN) {
    server = spawn(
      process.execPath,
      ['node_modules/next/dist/bin/next', 'start', '-p', String(PORT)],
      {
        env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
        stdio: ['ignore', 'inherit', 'inherit'],
      },
    )
  }

  try {
    await waitForServer()
    const results = []
    for (const target of targets) {
      results.push(await runTarget(target))
    }

    console.table(
      results.map((result) => ({
        route: result.pathname,
        requests: result.completed,
        failures: result.failed,
        errorRate: `${(result.errorRate * 100).toFixed(2)}%`,
        p50_ms: Math.round(result.p50),
        p95_ms: Math.round(result.p95),
        p99_ms: Math.round(result.p99),
      })),
    )

    const failures = results.filter(
      (result) => result.errorRate > MAX_ERROR_RATE || result.p95 > MAX_P95_MS,
    )
    if (failures.length) {
      throw new Error(
        `Stress thresholds failed: ${failures
          .map(
            (result) =>
              `${result.pathname} errorRate=${(result.errorRate * 100).toFixed(2)}% p95=${Math.round(result.p95)}ms`,
          )
          .join('; ')}`,
      )
    }
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM')
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2_000)
        server.once('exit', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      if (server.exitCode === null) server.kill('SIGKILL')
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
