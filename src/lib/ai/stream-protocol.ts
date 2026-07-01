import type { TutorMessage } from '@/lib/types'

export type TutorStreamEvent =
  | {
      type: 'meta'
      requestId: string
      modelProfile: 'fast' | 'quality'
      startedAt: number
    }
  | { type: 'delta'; text: string }
  | {
      type: 'done'
      message: TutorMessage
      sessionTitle?: string
      firstTokenMs?: number
      totalMs: number
      deduplicated?: boolean
    }
  | {
      type: 'error'
      code: string
      message: string
      retryable: boolean
      requestId: string
    }

export function encodeTutorStreamEvent(event: TutorStreamEvent) {
  return `${JSON.stringify(event)}\n`
}

export async function consumeTutorStream(
  response: Response,
  onEvent: (event: TutorStreamEvent) => void,
) {
  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error?.message || `Request failed (${response.status})`
    throw new Error(message)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      onEvent(JSON.parse(trimmed) as TutorStreamEvent)
    }
  }

  if (buffer.trim()) onEvent(JSON.parse(buffer.trim()) as TutorStreamEvent)
}
