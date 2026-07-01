import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getCodeRunnerConfig,
  parseCodingTestCases,
  publicCodingTestResults,
  runCodingSubmission,
} from './code-runner'

describe('coding code runner client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses reviewed coding test cases defensively', () => {
    expect(parseCodingTestCases(null)).toEqual([])
    expect(parseCodingTestCases('not-json')).toEqual([])
    expect(parseCodingTestCases(JSON.stringify([
      { input: '2 3', expected: '5' },
      { input: 1, expected: 'bad' },
      { input: '4 5', expected: '9' },
    ]))).toEqual([
      { input: '2 3', expected: '5' },
      { input: '4 5', expected: '9' },
    ])
  })

  it('requires a runner URL and production auth material before execution', () => {
    expect(getCodeRunnerConfig({ NODE_ENV: 'development' })).toMatchObject({
      configured: false,
      reason: 'CODE_RUNNER_URL is not configured.',
    })

    expect(getCodeRunnerConfig({
      NODE_ENV: 'production',
      CODE_RUNNER_URL: 'https://runner.example/run',
    })).toMatchObject({
      configured: false,
      reason: 'Production code runner calls require CODE_RUNNER_TOKEN or CODE_RUNNER_HMAC_SECRET.',
    })
  })

  it('returns not-configured when no trusted runner is available', async () => {
    const result = await runCodingSubmission({
      challengeId: 'challenge_1',
      language: 'cpp',
      code: 'int main(){return 0;}',
      testCases: [{ input: '', expected: '' }],
      timeLimitMs: 1000,
      memoryLimitKB: 64000,
    }, { NODE_ENV: 'development' })

    expect(result.configured).toBe(false)
    expect(result.status).toBe('runner_error')
    expect(result.message).toBe('CODE_RUNNER_URL is not configured.')
  })

  it('calls the remote runner with signed bounded payloads and normalizes pass results', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'passed',
        output: 'ok',
        testResults: [
          { index: 0, actual: '5', passed: true, durationMs: 12, memoryKB: 1024 },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await runCodingSubmission({
      challengeId: 'challenge_1',
      language: 'cpp',
      code: 'int main(){return 0;}',
      testCases: [{ input: '2 3', expected: '5' }],
      timeLimitMs: 1000,
      memoryLimitKB: 64000,
    }, {
      NODE_ENV: 'production',
      CODE_RUNNER_URL: 'https://runner.example/run',
      CODE_RUNNER_HMAC_SECRET: 'secret',
    })

    expect(result.configured).toBe(true)
    expect(result.status).toBe('passed')
    expect(result.testResults).toEqual([
      {
        index: 0,
        input: '2 3',
        expected: '5',
        actual: '5',
        stderr: null,
        passed: true,
        durationMs: 12,
        memoryKB: 1024,
      },
    ])
    expect(fetchMock).toHaveBeenCalledWith('https://runner.example/run', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'content-type': 'application/json',
        'x-lernio-signature': expect.any(String),
      }),
    }))
  })

  it('does not allow a runner to claim pass with incomplete results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'passed',
        testResults: [],
      }),
    }))

    const result = await runCodingSubmission({
      challengeId: 'challenge_1',
      language: 'cpp',
      code: 'int main(){return 0;}',
      testCases: [{ input: '', expected: '' }],
      timeLimitMs: 1000,
      memoryLimitKB: 64000,
    }, {
      NODE_ENV: 'production',
      CODE_RUNNER_URL: 'https://runner.example/run',
      CODE_RUNNER_TOKEN: 'token',
    })

    expect(result.status).toBe('runner_error')
    expect(result.message).toBe('Code runner returned an incomplete test result set.')
  })

  it('hides expected test values from public result payloads', () => {
    expect(publicCodingTestResults([
      {
        index: 0,
        input: 'secret input',
        expected: 'secret expected',
        actual: 'wrong',
        stderr: null,
        passed: false,
        durationMs: 3,
        memoryKB: 256,
      },
    ])).toEqual([
      {
        index: 0,
        actual: 'wrong',
        stderr: null,
        passed: false,
        durationMs: 3,
        memoryKB: 256,
      },
    ])
  })
})
