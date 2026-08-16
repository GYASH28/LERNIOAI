import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:https'
import { request as httpRequest } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const targetPort = Number(process.env.CI_NEXT_PORT || 3000)
const httpsPort = Number(process.env.CI_HTTPS_PORT || 3443)
const certDir = join(process.cwd(), '.ci-certs')
const keyPath = join(certDir, 'localhost-key.pem')
const certPath = join(certDir, 'localhost-cert.pem')

mkdirSync(certDir, { recursive: true })

if (!existsSync(keyPath) || !existsSync(certPath)) {
  const generated = spawnSync(
    'openssl',
    [
      'req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-nodes',
      '-keyout', keyPath,
      '-out', certPath,
      '-days', '1',
      '-subj', '/CN=localhost',
      '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    ],
    { stdio: 'inherit' },
  )
  if (generated.status !== 0) {
    throw new Error('Unable to generate the CI localhost certificate.')
  }
}

const next = spawn('npm', ['start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(targetPort),
    HOSTNAME: '127.0.0.1',
    NEXTAUTH_URL: `https://localhost:${httpsPort}`,
  },
})

const server = createServer(
  {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  },
  (clientReq, clientRes) => {
    const headers = {
      ...clientReq.headers,
      host: `localhost:${httpsPort}`,
      'x-forwarded-host': `localhost:${httpsPort}`,
      'x-forwarded-proto': 'https',
    }

    const upstream = httpRequest(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: clientReq.url,
        method: clientReq.method,
        headers,
      },
      (upstreamRes) => {
        clientRes.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
        upstreamRes.pipe(clientRes)
      },
    )

    upstream.on('error', (error) => {
      if (!clientRes.headersSent) clientRes.writeHead(502, { 'content-type': 'text/plain' })
      clientRes.end(`Lernio CI upstream unavailable: ${error.message}`)
    })
    clientReq.pipe(upstream)
  },
)

server.listen(httpsPort, '127.0.0.1', () => {
  console.log(`Lernio CI HTTPS ready on https://localhost:${httpsPort}`)
})

let closing = false
function close(exitCode = 0) {
  if (closing) return
  closing = true
  server.close(() => {
    if (!next.killed) next.kill('SIGTERM')
    process.exit(exitCode)
  })
  setTimeout(() => {
    if (!next.killed) next.kill('SIGKILL')
    process.exit(exitCode)
  }, 3000).unref()
}

next.on('exit', (code) => {
  if (!closing) close(code ?? 1)
})
process.on('SIGINT', () => close(0))
process.on('SIGTERM', () => close(0))
