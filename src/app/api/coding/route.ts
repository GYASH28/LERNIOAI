import { NextRequest, NextResponse } from 'next/server'
import { requireUser, withApi, ApiError } from '@/lib/auth'
import { getCodeRunnerConfig } from '@/lib/coding/code-runner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Code execution endpoint for C, C++, and Java.
 * Uses Wandbox API (free, unlimited, no API key required).
 *
 * Python and JavaScript run client-side in the browser via Pyodide/eval
 * — see code-playground.tsx for that implementation.
 *
 * Wandbox supports: C (gcc, clang), C++ (g++, clang++), and more.
 * https://github.com/melpon/wandbox/blob/master/API.md
 */

// Wandbox compiler IDs
const WANDBOX_COMPILERS: Record<string, string> = {
  c: 'gcc-head-c',
  cpp: 'gcc-head',
  'c++': 'gcc-head',
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    // Auth gate — the code runner is an authenticated student feature.
    // Without this, the endpoint becomes an open code-execution proxy.
    await requireUser()

    // Surface an unconfigured code runner honestly instead of silently
    // falling through to the public Wandbox fallback (which is fine for
    // local dev but must not masquerade as a working production backend).
    // In non-production, getCodeRunnerConfig() falls back to the public
    // Judge0 CE instance so the route stays usable for local development.
    const runnerConfig = getCodeRunnerConfig()
    if (!runnerConfig.configured) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'CODE_RUNNER_NOT_CONFIGURED',
            message: 'Code execution is not available. An administrator needs to configure the code runner.',
          },
        },
        { status: 503 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { code, language, stdin } = body

    if (!code || typeof code !== 'string') {
      throw new ApiError('BAD_REQUEST', 'Missing code', 400, false)
    }

    const langKey = (language || 'c').toLowerCase()
    const compiler = WANDBOX_COMPILERS[langKey]

    if (!compiler) {
      if (langKey === 'java') {
        return NextResponse.json({
          output: 'Java execution requires the Judge0 API.\n\nTo enable Java:\n1. Get a free key at rapidapi.com (search Judge0 CE)\n2. Add RAPIDAPI_KEY to Vercel env vars\n\nAlternatively, use Python or JavaScript which run free in the browser.',
          exitCode: -1,
          executed: false,
        })
      }
      throw new ApiError('BAD_REQUEST', `Unsupported language: ${language}`, 400, false)
    }

    // Call Wandbox API — free, unlimited, no key needed
    let wandboxResponse: Response
    try {
      wandboxResponse = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          compiler,
          stdin: stdin || '',
          runtime: true,
        }),
        signal: AbortSignal.timeout(20000),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('timeout') || message.includes('abort')) {
        throw new ApiError(
          'CODE_TIMEOUT',
          'Code execution timed out (20 second limit). Check for infinite loops.',
          504,
          true,
        )
      }
      throw new ApiError('CODE_EXEC_FAILED', `Failed to execute code: ${message}`, 500, true)
    }

    if (!wandboxResponse.ok) {
      const errorText = await wandboxResponse.text().catch(() => 'Unknown error')
      return NextResponse.json({
        error: `Wandbox API error (${wandboxResponse.status}): ${errorText}`,
        output: `Failed to execute code. Please try again.`,
        exitCode: -1,
        executed: false,
      })
    }

    const result = await wandboxResponse.json()

    // Build output from Wandbox response
    let output = ''
    if (result.compiler_output) {
      // Check if it's an error or just warnings
      if (result.compiler_error || result.status === 'failure') {
        output += `Compilation Error:\n${result.compiler_output}\n`
      } else {
        // Warnings — show but continue
        output += result.compiler_output
      }
    }
    if (result.compiler_error) {
      output += result.compiler_error
    }
    if (result.program_output) {
      output += result.program_output
    }
    if (result.program_error) {
      output += `\nRuntime Error:\n${result.program_error}\n`
    }
    if (result.status === 'failure' && !output) {
      output = 'Compilation failed. Check your code for syntax errors.'
    }
    if (!output) {
      output = 'No output (program ran successfully but produced no output)'
    }

    return NextResponse.json({
      output,
      exitCode: result.status === 'success' ? 0 : 1,
      language: langKey,
      executed: true,
    })
  })
}
