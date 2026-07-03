import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Code execution endpoint.
 * Uses Judge0 CE (free tier) via RapidAPI or the public instance.
 * Supports C, C++, Python, Java, and JavaScript.
 */

// Language mapping for Judge0
const LANGUAGE_MAP: Record<string, number> = {
  c: 50,           // C (GCC 9.2.0)
  cpp: 54,         // C++ (GCC 9.2.0)
  'c++': 54,
  python: 71,      // Python (3.8.1)
  python3: 71,
  java: 62,        // Java (OpenJDK 13.0.1)
  javascript: 63,  // JavaScript (Node.js 12.14.0)
  js: 63,
}

const JUDGE0_URL = 'https://judge0-ce.p.rapidapi.com'
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || process.env.JUDGE0_API_KEY || ''

/**
 * Try multiple free code execution APIs in order:
 * 1. Judge0 via RapidAPI (if key configured)
 * 2. Sphere Engine (if key configured)
 * 3. Piston (may work for some requests)
 * 4. Fallback: return a helpful error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { code, language, stdin } = body

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    const langKey = (language || 'c').toLowerCase()
    const judge0LangId = LANGUAGE_MAP[langKey]

    if (!judge0LangId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}. Supported: C, C++, Python, Java, JavaScript` },
        { status: 400 },
      )
    }

    // Try Judge0 via RapidAPI
    if (RAPIDAPI_KEY) {
      const result = await runWithJudge0(code, judge0LangId, stdin || '', langKey)
      return NextResponse.json(result)
    }

    // Try free Piston API (might work for some requests)
    const pistonResult = await runWithPiston(code, langKey, stdin || '')
    if (pistonResult) {
      return NextResponse.json(pistonResult)
    }

    // No API key configured — return helpful error
    return NextResponse.json({
      error: 'Code execution requires a free API key. Add RAPIDAPI_KEY to Vercel env vars (get one at rapidapi.com/judge0). See /coding for details.',
      output: 'Code execution not configured.\n\nTo enable code execution:\n1. Go to rapidapi.com\n2. Search for "Judge0 CE"\n3. Subscribe (free tier: 100 requests/day)\n4. Add RAPIDAPI_KEY to Vercel env vars',
      exitCode: -1,
      language: langKey,
      executed: false,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to execute code: ${message}` },
      { status: 500 },
    )
  }
}

/**
 * Run code using Judge0 CE via RapidAPI
 */
async function runWithJudge0(
  code: string,
  languageId: number,
  stdin: string,
  langKey: string,
): Promise<any> {
  // Step 1: Submit the code
  const submitResponse = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
    },
    body: JSON.stringify({
      language_id: languageId,
      source_code: code,
      stdin: stdin,
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!submitResponse.ok) {
    const errorText = await submitResponse.text().catch(() => 'Unknown error')
    throw new Error(`Judge0 API error (${submitResponse.status}): ${errorText}`)
  }

  const result = await submitResponse.json()

  // Build output
  let output = ''
  if (result.compile_output) {
    output += `Compilation Error:\n${result.compile_output}\n`
  }
  if (result.stdout) {
    output += result.stdout
  }
  if (result.stderr) {
    output += `\nRuntime Error:\n${result.stderr}\n`
  }
  if (result.message) {
    output += `\n${result.message}\n`
  }
  if (!output) {
    output = 'No output (program ran successfully but produced no output)'
  }

  return {
    output,
    exitCode: result.status?.id === 3 ? 0 : (result.status?.id || -1),
    language: langKey,
    executed: true,
  }
}

/**
 * Try the free Piston API (may not work — whitelist only since Feb 2026)
 */
async function runWithPiston(
  code: string,
  langKey: string,
  stdin: string,
): Promise<any | null> {
  const PISTON_LANG_MAP: Record<string, { language: string; version: string }> = {
    c: { language: 'c', version: '10.2.0' },
    cpp: { language: 'c++', version: '10.2.0' },
    'c++': { language: 'c++', version: '10.2.0' },
    python: { language: 'python3', version: '3.10.0' },
    python3: { language: 'python3', version: '3.10.0' },
    java: { language: 'java', version: '15.0.2' },
    javascript: { language: 'javascript', version: '18.15.0' },
    js: { language: 'javascript', version: '18.15.0' },
  }

  const langConfig = PISTON_LANG_MAP[langKey]
  if (!langConfig) return null

  try {
    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [{ name: 'main', content: code }],
        stdin: stdin,
        compile_timeout: 10000,
        run_timeout: 5000,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) return null

    const result = await response.json()

    let output = ''
    if (result?.compile?.stderr) {
      output += `Compilation Error:\n${result.compile.stderr}\n`
    }
    if (result?.run?.stdout) {
      output += result.run.stdout
    }
    if (result?.run?.stderr) {
      output += `\nRuntime Error:\n${result.run.stderr}\n`
    }
    if (!output) {
      output = 'No output'
    }

    return {
      output,
      exitCode: result?.run?.code ?? 0,
      language: langKey,
      executed: true,
    }
  } catch {
    return null
  }
}
