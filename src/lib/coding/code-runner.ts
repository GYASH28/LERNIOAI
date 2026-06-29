import { createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'

export interface CodingTestCase {
  input: string
  expected: string
}

export type CodeRunnerStatus =
  | 'passed'
  | 'failed'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'runner_error'

export interface CodingTestResult {
  index: number
  input: string
  expected: string
  actual: string
  stderr: string | null
  passed: boolean
  durationMs: number | null
  memoryKB: number | null
}

export interface CodeRunnerResult {
  configured: boolean
  status: CodeRunnerStatus
  output: string | null
  compileError: string | null
  testResults: CodingTestResult[]
  message: string
}

export interface RunCodingSubmissionInput {
  challengeId: string
  language: 'cpp' | 'c' | 'python'
  code: string
  testCases: CodingTestCase[]
  timeLimitMs: number
  memoryLimitKB: number
}

interface CodeRunnerEnv {
  CODE_RUNNER_URL?: string
  CODE_RUNNER_TOKEN?: string
  CODE_RUNNER_HMAC_SECRET?: string
  NODE_ENV?: string
}

const MAX_TEST_CASES = 50
const MAX_TEST_IO_CHARS = 10_000
const MAX_OUTPUT_CHARS = 20_000
const MAX_ERROR_CHARS = 20_000
const RUNNER_TIMEOUT_MS = 15_000

const RemoteRunnerTestResultSchema = z.object({
  index: z.number().int().min(0).optional(),
  actual: z.string().nullable().optional(),
  output: z.string().nullable().optional(),
  stderr: z.string().nullable().optional(),
  passed: z.boolean(),
  durationMs: z.number().finite().nonnegative().nullable().optional(),
  memoryKB: z.number().finite().nonnegative().nullable().optional(),
})

const RemoteRunnerResponseSchema = z.object({
  status: z
    .enum(['passed', 'failed', 'compile_error', 'runtime_error', 'timeout', 'runner_error'])
    .optional(),
  output: z.string().nullable().optional(),
  compileError: z.string().nullable().optional(),
  stderr: z.string().nullable().optional(),
  testResults: z.array(RemoteRunnerTestResultSchema).optional(),
})

export function parseCodingTestCases(value: string | null | undefined): CodingTestCase[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item): CodingTestCase | null => {
        if (!item || typeof item !== 'object') return null
        const record = item as Record<string, unknown>
        if (typeof record.input !== 'string' || typeof record.expected !== 'string') return null
        return {
          input: clampText(record.input, MAX_TEST_IO_CHARS),
          expected: clampText(record.expected, MAX_TEST_IO_CHARS),
        }
      })
      .filter((item): item is CodingTestCase => item !== null)
      .slice(0, MAX_TEST_CASES)
  } catch {
    return []
  }
}

export function getCodeRunnerConfig(env: CodeRunnerEnv = process.env) {
  const url = env.CODE_RUNNER_URL?.trim()
  const token = env.CODE_RUNNER_TOKEN?.trim()
  const hmacSecret = env.CODE_RUNNER_HMAC_SECRET?.trim()
  if (!url) {
    return {
      configured: false as const,
      reason: 'CODE_RUNNER_URL is not configured.',
      url: null,
      token: token || null,
      hmacSecret: hmacSecret || null,
    }
  }
  if (env.NODE_ENV === 'production' && !token && !hmacSecret) {
    return {
      configured: false as const,
      reason: 'Production code runner calls require CODE_RUNNER_TOKEN or CODE_RUNNER_HMAC_SECRET.',
      url,
      token: null,
      hmacSecret: null,
    }
  }
  return {
    configured: true as const,
    reason: null,
    url,
    token: token || null,
    hmacSecret: hmacSecret || null,
  }
}

export async function runCodingSubmission(
  input: RunCodingSubmissionInput,
  env: CodeRunnerEnv = process.env,
): Promise<CodeRunnerResult> {
  if (input.testCases.length === 0) {
    return disabledResult('No reviewed test cases are configured for this challenge.')
  }

  const config = getCodeRunnerConfig(env)
  if (!config.configured) return disabledResult(config.reason)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RUNNER_TIMEOUT_MS)
  try {
    const body = JSON.stringify({
      schemaVersion: 'lernio-code-runner-v1',
      requestId: randomUUID(),
      challengeId: input.challengeId,
      language: input.language,
      code: input.code,
      testCases: input.testCases,
      limits: {
        timeLimitMs: input.timeLimitMs,
        memoryLimitKB: input.memoryLimitKB,
      },
    })

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-lernio-runner-schema': 'lernio-code-runner-v1',
    }
    if (config.token) headers.authorization = `Bearer ${config.token}`
    if (config.hmacSecret) {
      headers['x-lernio-signature'] = createHmac('sha256', config.hmacSecret).update(body).digest('hex')
    }

    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body,
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      return runnerError(`Code runner returned HTTP ${response.status}.`)
    }

    const parsed = RemoteRunnerResponseSchema.safeParse(await response.json())
    if (!parsed.success) {
      return runnerError('Code runner returned an invalid response shape.')
    }

    const testResults = normalizeTestResults(parsed.data.testResults ?? [], input.testCases)
    if (testResults.length !== input.testCases.length) {
      return runnerError('Code runner returned an incomplete test result set.')
    }

    const allPassed = testResults.every((result) => result.passed)
    const reportedStatus = parsed.data.status ?? (allPassed ? 'passed' : 'failed')
    const status: CodeRunnerStatus = reportedStatus === 'passed' && !allPassed ? 'failed' : reportedStatus
    const message = status === 'passed'
      ? 'All reviewed test cases passed.'
      : status === 'failed'
        ? 'One or more reviewed test cases failed.'
        : runnerStatusMessage(status)

    return {
      configured: true,
      status,
      output: clampNullableText(parsed.data.output ?? null, MAX_OUTPUT_CHARS),
      compileError: clampNullableText(parsed.data.compileError ?? parsed.data.stderr ?? null, MAX_ERROR_CHARS),
      testResults,
      message,
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return runnerError(aborted ? 'Code runner timed out.' : 'Code runner request failed.')
  } finally {
    clearTimeout(timeout)
  }
}

export function publicCodingTestResults(results: CodingTestResult[]) {
  return results.map((result) => ({
    index: result.index,
    passed: result.passed,
    actual: result.actual,
    stderr: result.stderr,
    durationMs: result.durationMs,
    memoryKB: result.memoryKB,
  }))
}

function normalizeTestResults(
  results: Array<z.infer<typeof RemoteRunnerTestResultSchema>>,
  testCases: CodingTestCase[],
): CodingTestResult[] {
  return results.slice(0, testCases.length).map((result, position) => {
    const index = typeof result.index === 'number' ? result.index : position
    const testCase = testCases[index] ?? testCases[position] ?? { input: '', expected: '' }
    return {
      index,
      input: testCase.input,
      expected: testCase.expected,
      actual: clampText(result.actual ?? result.output ?? '', MAX_TEST_IO_CHARS),
      stderr: clampNullableText(result.stderr ?? null, MAX_ERROR_CHARS),
      passed: result.passed,
      durationMs: typeof result.durationMs === 'number' ? result.durationMs : null,
      memoryKB: typeof result.memoryKB === 'number' ? result.memoryKB : null,
    }
  })
}

function disabledResult(message: string): CodeRunnerResult {
  return {
    configured: false,
    status: 'runner_error',
    output: null,
    compileError: null,
    testResults: [],
    message,
  }
}

function runnerError(message: string): CodeRunnerResult {
  return {
    configured: true,
    status: 'runner_error',
    output: null,
    compileError: message,
    testResults: [],
    message,
  }
}

function runnerStatusMessage(status: CodeRunnerStatus): string {
  if (status === 'compile_error') return 'Compilation failed before tests could run.'
  if (status === 'runtime_error') return 'The program crashed while running reviewed tests.'
  if (status === 'timeout') return 'The program exceeded the configured time limit.'
  return 'Code runner could not complete the submission.'
}

function clampText(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value
}

function clampNullableText(value: string | null, limit: number): string | null {
  if (value === null) return null
  return value.length > limit ? value.slice(0, limit) : value
}
