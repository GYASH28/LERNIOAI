'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Loader2, Plus, Send, Sparkles, Square } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { TUTOR_MODES, type TutorMessage, type TutorMode, type TutorSession } from '@/lib/types'

const QUICK = [
  'Explain this simply with one example.',
  'Create short exam notes.',
  'Quiz me one question at a time.',
]

const THINKING_STEPS = [
  'Reading your question carefully',
  'Checking relevant course context',
  'Structuring the answer',
  'Writing it in a clear study format',
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getApiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'LEO could not answer right now.'
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'LEO could not answer right now.'
}

function parseFollowUps(message: TutorMessage) {
  if (!message.followUps) return []
  try {
    const parsed = JSON.parse(message.followUps) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
      : []
  } catch {
    return []
  }
}

function visibleSlice(content: string, count: number) {
  return content.slice(0, count)
}

function createClientMessageId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function TutorView() {
  const { subjects } = useAppStore()
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [subjectId, setSubjectId] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const [thinkingStep, setThinkingStep] = useState(0)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const revealResolveRef = useRef<(() => void) | null>(null)
  const revealTokenRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const subject = useMemo(
    () => subjects.find((item) => item.id === subjectId),
    [subjects, subjectId],
  )
  const selectedMode = useMemo(
    () => TUTOR_MODES.find((item) => item.key === mode),
    [mode],
  )
  const activeSession = useMemo(
    () => sessions.find((item) => item.id === sessionId),
    [sessions, sessionId],
  )

  useEffect(() => {
    void fetch('/api/tutor/session')
      .then((response) => response.json())
      .then((payload) => {
        if (!payload.ok) return
        const loaded = payload.data as TutorSession[]
        setSessions(loaded)
        if (loaded[0]) {
          setSessionId(loaded[0].id)
          setMessages(loaded[0].messages || [])
          setMode((loaded[0].mode as TutorMode) || 'explain_simple')
          setSubjectId(loaded[0].subjectId || '')
        }
      })
      .catch(() => setError('Could not load tutor sessions.'))
  }, [])

  useEffect(() => {
    if (!sending) return
    const timer = setInterval(() => {
      setThinkingStep((current) => Math.min(current + 1, THINKING_STEPS.length - 1))
    }, 1400)
    return () => clearInterval(timer)
  }, [sending])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, sending, revealing, thinkingStep])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    }
  }, [])

  async function createSession() {
    const response = await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New session', mode, subjectId: subjectId || undefined }),
    })
    const payload = await response.json()
    if (!payload.ok) {
      setError(getApiErrorMessage(payload))
      return ''
    }
    const session = payload.data as TutorSession
    setSessions((current) => [session, ...current])
    setSessionId(session.id)
    setMessages([])
    setError('')
    return session.id
  }

  function switchSession(item: TutorSession) {
    stop()
    setSessionId(item.id)
    setMessages(item.messages || [])
    setMode((item.mode as TutorMode) || 'explain_simple')
    setSubjectId(item.subjectId || '')
    setError('')
  }

  function stop() {
    abortRef.current?.abort()
    abortRef.current = null
    revealTokenRef.current += 1
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current)
    revealTimerRef.current = null
    revealResolveRef.current?.()
    revealResolveRef.current = null
    setSending(false)
    setRevealing(false)
    setThinkingStep(0)
  }

  async function revealAssistantMessage(message: TutorMessage) {
    const revealToken = ++revealTokenRef.current
    setRevealing(true)
    setMessages((current) => [...current, { ...message, content: '' }])

    const content = message.content || ''
    let visible = 0
    const chunkSize = Math.max(18, Math.round(content.length / 80))

    await new Promise<void>((resolve) => {
      revealResolveRef.current = resolve
      const tick = () => {
        if (revealTokenRef.current !== revealToken) {
          resolve()
          return
        }
        visible = Math.min(content.length, visible + chunkSize)
        setMessages((current) =>
          current.map((item) =>
            item.id === message.id ? { ...item, content: visibleSlice(content, visible) } : item,
          ),
        )

        if (visible >= content.length) {
          revealTimerRef.current = null
          resolve()
          return
        }

        revealTimerRef.current = setTimeout(tick, 28)
      }
      tick()
    })

    if (revealTokenRef.current === revealToken) {
      revealResolveRef.current = null
      setRevealing(false)
    }
  }

  async function send(text = draft) {
    const clean = text.trim()
    if (!clean || sending || revealing) return

    let id = sessionId
    if (!id) id = await createSession()
    if (!id) return

    const startedAt = Date.now()
    const clientMessageId = createClientMessageId()
    const pending: TutorMessage = {
      id: clientMessageId,
      role: 'user',
      content: clean,
      mode,
    }

    setDraft('')
    setError('')
    setMessages((current) => [...current, pending])
    setThinkingStep(0)
    setSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: id,
          clientMessageId,
          message: clean,
          mode,
          subjectName: subject?.name,
        }),
      })
      const payload = await response.json()
      if (!payload.ok) throw new Error(getApiErrorMessage(payload))

      const elapsed = Date.now() - startedAt
      if (elapsed < 950) await sleep(950 - elapsed)

      const assistantMessage = payload.data.message as TutorMessage
      const sessionTitle = payload.data.sessionTitle as string | undefined
      if (sessionTitle) {
        setSessions((current) =>
          current.map((item) => (item.id === id ? { ...item, title: sessionTitle } : item)),
        )
      }
      setSending(false)
      await revealAssistantMessage(assistantMessage)
      setSessions((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                title: sessionTitle || item.title,
                messages: [...(item.messages || []), pending, assistantMessage],
              }
            : item,
        ),
      )
    } catch (sendError) {
      if ((sendError as Error).name !== 'AbortError') {
        setError(sendError instanceof Error ? sendError.message : 'LEO could not answer right now.')
      }
      setSending(false)
    } finally {
      abortRef.current = null
    }
  }

  const leoState = sending ? 'thinking' : revealing ? 'explaining' : 'greeting'

  return (
    <div className="mx-auto grid w-full max-w-[1400px] gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="hidden min-h-[680px] p-3 lg:block">
        <Button className="mb-3 w-full" onClick={() => void createSession()}>
          <Plus className="mr-2 h-4 w-4" />
          New session
        </Button>
        <div className="space-y-1">
          {sessions.map((item) => (
            <button
              key={item.id}
              onClick={() => switchSession(item)}
              className={cn(
                'w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted',
                item.id === sessionId && 'bg-primary/10 text-primary',
              )}
            >
              <span className="line-clamp-2 font-medium">{item.title}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {(item.mode || 'explain_simple').replaceAll('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex min-h-[680px] min-w-0 flex-col overflow-hidden">
        <div className="border-b bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <Mascot mascot="leo" state={leoState} size={44} />
            <div className="min-w-0">
              <h2 className="font-bold">LEO AI Tutor</h2>
              <p className="truncate text-xs text-muted-foreground">
                {sending
                  ? THINKING_STEPS[thinkingStep]
                  : revealing
                    ? 'Composing the final answer'
                    : activeSession?.title || 'Fast, structured answers for your syllabus'}
              </p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={mode} onValueChange={(value) => setMode(value as TutorMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TUTOR_MODES.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={subjectId || 'all'}
              onValueChange={(value) => setSubjectId(value === 'all' ? '' : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMode ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedMode.desc}
              {subject ? ` for ${subject.code}` : ''}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <Mascot mascot="leo" state="greeting" size={86} />
              <h3 className="mt-4 text-2xl font-bold">What should we learn?</h3>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Ask a concept, paste your answer, or choose a quick start. LEO will keep it structured and exam useful.
              </p>
              <div className="mt-5 grid max-w-3xl gap-2 sm:grid-cols-3">
                {QUICK.map((item) => (
                  <button
                    key={item}
                    onClick={() => void send(item)}
                    className="rounded-xl border p-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-4">
              {messages.map((item) =>
                item.role === 'user' ? (
                  <div key={item.id} className="flex justify-end">
                    <div className="max-w-[82%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                      {item.content}
                    </div>
                  </div>
                ) : (
                  <div key={item.id} className="rounded-2xl border bg-background p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      LEO
                    </div>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{item.content || ' '}</ReactMarkdown>
                    </div>
                    {parseFollowUps(item).length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {parseFollowUps(item).map((followUp) => (
                          <button
                            key={followUp}
                            onClick={() => void send(followUp)}
                            className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:text-primary"
                            disabled={sending || revealing}
                          >
                            {followUp}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ),
              )}
              {sending ? (
                <div className="rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <Mascot mascot="leo" state="thinking" size={36} />
                    <div>
                      <p className="font-semibold text-foreground">LEO is thinking</p>
                      <p>{THINKING_STEPS[thinkingStep]}</p>
                    </div>
                    <Loader2 className="ml-auto h-4 w-4 animate-spin" />
                  </div>
                </div>
              ) : null}
              {error ? (
                <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                  {error}
                </div>
              ) : null}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        <div className="border-t p-3">
          <div className="mx-auto max-w-4xl rounded-2xl border p-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
              placeholder="Ask LEO anything about your studies..."
              className="min-h-[76px] resize-none border-0 shadow-none focus-visible:ring-0"
              disabled={sending || revealing}
            />
            <div className="flex justify-end">
              {sending || revealing ? (
                <Button variant="destructive" size="sm" onClick={stop}>
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button size="sm" disabled={!draft.trim()} onClick={() => void send()}>
                  <Send className="mr-2 h-4 w-4" />
                  Send
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
