import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Code execution endpoint.
 * Uses the free Piston API (https://emkc.org/api/v2/piston) to actually
 * compile and run code in C, C++, Python, Java, and JavaScript.
 * No API key required for basic usage.
 */

const PISTON_API = 'https://emkc.org/api/v2/piston/execute'

// Language mapping for Piston API
const LANGUAGE_MAP: Record<string, { language: string; version: string }> = {
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'c++', version: '10.2.0' },
  'c++': { language: 'c++', version: '10.2.0' },
  python: { language: 'python3', version: '3.10.0' },
  python3: { language: 'python3', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
  javascript: { language: 'javascript', version: '18.15.0' },
  js: { language: 'javascript', version: '18.15.0' },
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { code, language, stdin } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Missing code' },
        { status: 400 },
      )
    }

    const langKey = (language || 'c').toLowerCase()
    const langConfig = LANGUAGE_MAP[langKey]

    if (!langConfig) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}. Supported: C, C++, Python, Java, JavaScript` },
        { status: 400 },
      )
    }

    // Call the Piston API to execute the code
    const pistonResponse = await fetch(PISTON_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: 'main', content: code }],
        stdin: stdin || '',
        compile_timeout: 10000,
        run_timeout: 5000,
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    })

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text().catch(() => 'Unknown error')
      return NextResponse.json(
        { error: `Code execution service error (${pistonResponse.status}): ${errorText}` },
        { status: 502 },
      )
    }

    const result = await pistonResponse.json()

    // Extract output from Piston API response
    const runOutput = result?.run?.stdout || ''
    const runError = result?.run?.stderr || ''
    const compileOutput = result?.compile?.stdout || ''
    const compileError = result?.compile?.stderr || ''
    const exitCode = result?.run?.code ?? 0

    // Build the output string
    let output = ''
    if (compileError) {
      output += `Compilation Error:\n${compileError}\n`
    }
    if (compileOutput) {
      output += compileOutput
    }
    if (runOutput) {
      output += runOutput
    }
    if (runError) {
      output += `\nRuntime Error:\n${runError}\n`
    }
    if (exitCode !== 0 && !runError) {
      output += `\n(Process exited with code ${exitCode})\n`
    }
    if (!output) {
      output = 'No output'
    }

    return NextResponse.json({
      output,
      exitCode,
      language: langConfig.language,
      executed: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // Check if it's a timeout
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json(
        { error: 'Code execution timed out (15 second limit). Check for infinite loops.' },
        { status: 504 },
      )
    }

    return NextResponse.json(
      { error: `Failed to execute code: ${message}` },
      { status: 500 },
    )
  }
}
