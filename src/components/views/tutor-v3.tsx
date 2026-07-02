'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AlertCircle,
  Bot,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  Gauge,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  RefreshCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTtsPlayer } from '@/hooks/use-tts-player'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { cn } from '@/lib/utils'
import { TUTOR_MODES, type TutorMessage, type TutorMode, type TutorSession } from '@/lib/types'

const QUICK_STARTS: Array<{ title: string; prompt: string; mode: TutorMode }> = [
  {
    title: 'Understand a concept',
    prompt: 'Explain this concept simply with one practical example: ',
    mode: 'explain_simple',
  },
  {
    title: 'Prepare an exam answer',
    prompt: 'Write an exam-ready answer for: ',
    mode: 'exam_answer',
  },
  {
    title: 'Create quick revision notes',
    prompt: 'Create short revision notes for: ',
    mode: 'short_notes',
  },
  {
    title: 'Debug my code',
    prompt: 'Debug this code and explain the smallest correction:\n\n',
    mode: 'debug_code',
  },
]

const FEATURED_MODES: TutorMode[] = [
  'explain_simple',
  'exam_answer',
  'short_notes',
  'create_mcqs',
  'debug_code',
]

type AiStatus = 'checking' | 'online' | 'not_configured' | 'offline'
type Phase = 'idle' | 'creating_session' | 'connecting' | 'streaming'

function createClientMessageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getApiErrorMessage(payload: unknown, fallback = 'LEO could not answer right now.') {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

async function readJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>
}

function parseStringArray(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function parseCitations(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is { sourceId: string; title: string; location?: string } => {
        if (!item || typeof item !== 'object') return false
        const row = item as Record<string, unknown>
        return typeof row.sourceId === 'string' && typeof row.title === 'string'
      })
      .slice(0, 6)
  } catch {
    return []
  }
}

export function TutorView() {
  const { subjects } = useAppStore()
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [subjectId, setSubjectId] = useState('')
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [firstTokenMs, setFirstTokenMs] = useState<number | null>(null)
  const [totalMs, setTotalMs] = useState<number | null>(null)
  const [status, setStatus] = useState<AiStatus>('checking')
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const lastPromptRef = useRef('')
  const { playing, loading: voiceLoading, error: voiceError, play, stop: stopVoice } = useTtsPlayer()

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
  const busy = phase !== 'idle'

  useEffect(() => {
    let cancelled = false

    async function initialise() {
      const [sessionsResult, statusResult] = await Promise.allSettled([
        fetch('/api/tutor/session', { cache: 'no-store' }),
        fetch('/api/ai/status', { cache: 'no-store' }),
      ])

      if (cancelled) return

      if (sessionsResult.status === 'fulfilled') {
        const payload = await readJson(sessionsResult.value)
        if (sessionsResult.value.ok && (payload as { ok?: boolean })?.ok) {
          const loaded = ((payload as { data?: TutorSession[] }).data || []) as TutorSession[]
          setSessions(loaded)
          if (loaded[0]) {
            setSessionId(loaded[0].id)
            setMessages(loaded[0].messages || [])
            setMode((loaded[0].mode as TutorMode) || 'explain_simple')
            setSubjectId(loaded[0].subjectId || '')
          }
        } else {
          setError(getApiErrorMessage(payload, 'Could not load your tutor conversations. You can still try starting a new one.'))
        }
      } else {
        setError('Could not load your tutor conversations. Check your connection and try again.')
      }

      if (statusResult.status === 'fulfilled') {
        const payload = await readJson(statusResult.value)
        setStatus(
          (payload as { ok?: boolean; data?: { available?: boolean } })?.ok &&
            (payload as { data?: { available?: boolean } }).data?.available
            ? 'online'
            : (payload as { ok?: boolean })?.ok
              ? 'not_configured'
              : 'offline',
        )
      } else {
        setStatus('offline')
      }
    }

    void initialise()

    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, phase, error])

  async function createSession(signal?: AbortSignal) {
    const response = await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        title: 'New session',
        mode,
        subjectId: subjectId || undefined,
      }),
    })
    const payload = await readJson(response)

    if (!response.ok || !(payload as { ok?: boolean })?.ok) {
      throw new Error(getApiErrorMessage(payload, `Could not create a tutor conversation (${response.status}).`))
    }

    const session = (payload as { data: TutorSession }).data
    if (!session?.id) throw new Error('The tutor session was created without a valid ID. Please retry.')

    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
    setSessionId(session.id)
    setFirstTokenMs(null)
    setTotalMs(null)
    return session
  }

  async function handleNewSession() {
    if (busy) return
    setError('')
    setPhase('creating_session')
    try {
      await createSession()
      setMessages([])
      window.setTimeout(() => composerRef.current?.focus(), 0)
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : 'Could not create a new conversation.')
    } finally {
      setPhase('idle')
    }
  }

  function switchSession(item: TutorSession) {
    stopGeneration()
    stopVoice()
    setSessionId(item.id)
    setMessages(item.messages || [])
    setMode((item.mode as TutorMode) || 'explain_simple')
    setSubjectId(item.subjectId || '')
    setError('')
    setFirstTokenMs(null)
    setTotalMs(null)
    setSessionsOpen(false)
  }

  async function deleteSession(item: TutorSession) {
    if (busy) return
    try {
      const response = await fetch(`/api/tutor/session?sessionId=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })
      const payload = await readJson(response)
      if (!response.ok || !(payload as { ok?: boolean })?.ok) {
        throw new Error(getApiErrorMessage(payload, 'Could not delete this conversation.'))
      }

      const next = sessions.filter((session) => session.id !== item.id)
      setSessions(next)
      if (sessionId === item.id) {
        const replacement = next[0]
        setSessionId(replacement?.id || '')
        setMessages(replacement?.messages || [])
        setMode((replacement?.mode as TutorMode) || 'explain_simple')
        setSubjectId(replacement?.subjectId || '')
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this conversation.')
    }
  }

  function stopGeneration() {
    abortRef.current?.abort()
    abortRef.current = null
    sendingRef.current = false
    setPhase('idle')
  }

  async function send(text = draft, forcedMode?: TutorMode) {
    const clean = text.trim()
    if (!clean || sendingRef.current) return

    sendingRef.current = true
    const activeMode = forcedMode || mode
    if (forcedMode) setMode(forcedMode)

    const controller = new AbortController()
    abortRef.current = controller
    const sessionTimer = window.setTimeout(() => controller.abort('session_timeout'), 20_000)

    let id = sessionId
    let streamMessageId = ''
    let optimisticAdded = false

    setError('')
    setFirstTokenMs(null)
    setTotalMs(null)
    setPhase(id ? 'connecting' : 'creating_session')

    try {
      if (!id) {
        const created = await createSession(controller.signal)
        id = created.id
      }
      window.clearTimeout(sessionTimer)

      const clientMessageId = createClientMessageId()
      streamMessageId = `stream-${clientMessageId}`
      const pending: TutorMessage = {
        id: clientMessageId,
        clientMessageId,
        role: 'user',
        content: clean,
        mode: activeMode,
      }

      lastPromptRef.current = clean
      setDraft('')
      setMessages((current) => [
        ...current,
        pending,
        {
          id: streamMessageId,
          clientMessageId,
          role: 'assistant',
          content: '',
          mode: activeMode,
        },
      ])
      optimisticAdded = true
      setPhase('connecting')

      let streamFailure = ''
      let completed = false
      const response = await fetch('/api/tutor/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: id,
          clientMessageId,
          message: clean,
          mode: activeMode,
          subjectName: subject?.name,
        }),
      })

      await consumeTutorStream(response, (event: TutorStreamEvent) => {
        if (event.type === 'delta') {
          setPhase('streaming')
          setMessages((current) =>
            current.map((item) =>
              item.id === streamMessageId
                ? { ...item, content: `${item.content}${event.text}` }
                : item,
            ),
          )
        } else if (event.type === 'done') {
          completed = true
          setMessages((current) =>
            current.map((item) => (item.id === streamMessageId ? event.message : item)),
          )
          setFirstTokenMs(event.firstTokenMs ?? null)
          setTotalMs(event.totalMs)
          setSessions((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    title: event.sessionTitle || item.title,
                    mode: activeMode,
                    messages: [...(item.messages || []), pending, event.message],
                  }
                : item,
            ),
          )
        } else if (event.type === 'error') {
          streamFailure = event.message
        }
      })

      if (streamFailure) throw new Error(streamFailure)
      if (!completed) throw new Error('LEO ended the response before it was complete. Please retry.')
      setStatus('online')
    } catch (sendError) {
      const aborted = controller.signal.aborted || (sendError as Error).name === 'AbortError'
      if (!aborted) {
        const message = sendError instanceof Error ? sendError.message : 'LEO could not answer right now.'
        setError(message)
        setDraft((current) => current || clean)
      } else if (controller.signal.reason === 'session_timeout') {
        setError('Creating the conversation took too long. Please check your connection and press Send again.')
        setDraft((current) => current || clean)
      }

      if (optimisticAdded && streamMessageId) {
        setMessages((current) =>
          current.filter((item) => item.id !== streamMessageId || item.content.trim().length > 0),
        )
      }
    } finally {
      window.clearTimeout(sessionTimer)
      abortRef.current = null
      sendingRef.current = false
      setPhase('idle')
    }
  }

  function submitComposer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send()
  }

  async function copyMessage(message: TutorMessage) {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setError('Could not copy this response. Select the text and copy it manually.')
    }
  }

  function retryLast() {
    if (!lastPromptRef.current || busy) return
    void send(lastPromptRef.current)
  }

  const leoState = phase === 'streaming' ? 'explaining' : busy ? 'thinking' : 'greeting'
  const phaseLabel =
    phase === 'creating_session'
      ? 'Starting conversation…'
      : phase === 'connecting'
        ? 'Connecting to LEO…'
        : phase === 'streaming'
          ? 'Answering live…'
          : ''

  return (
    <div className="mx-auto grid w-full max-w-[1500px] gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <Card
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[min(310px,86vw)] overflow-hidden rounded-none border-y-0 p-3 shadow-2xl transition-transform xl:static xl:z-auto xl:min-h-[760px] xl:w-auto xl:translate-x-0 xl:rounded-xl xl:border-y',
          sessionsOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 border-b pb-3">
          <Button type="button" className="flex-1 gap-2" onClick={() => void handleNewSession()} disabled={busy}>
            {phase === 'creating_session' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
            New conversation
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="xl:hidden"
            onClick={() => setSessionsOpen(false)}
            aria-label="Close conversations"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        <div className="mt-3 space-y-1 overflow-y-auto pb-6 xl:max-h-[690px]">
          {sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
              Your conversations will appear here after the first message is sent.
            </div>
          ) : null}
          {sessions.map((item) => (
            <div
              key={item.id}
              className={cn(
                'group flex items-start gap-1 rounded-xl border border-transparent p-1 transition',
                item.id === sessionId ? 'border-primary/20 bg-primary/8' : 'hover:bg-muted/50',
              )}
            >
              <button
                type="button"
                onClick={() => switchSession(item)}
                className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left"
              >
                <span className="line-clamp-2 text-sm font-semibold">{item.title}</span>
                <span className="mt-1 block text-[11px] capitalize text-muted-foreground">
                  {(item.mode || 'explain_simple').replaceAll('_', ' ')}
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-60 hover:text-destructive group-hover:opacity-100"
                onClick={() => void deleteSession(item)}
                disabled={busy}
                aria-label={`Delete ${item.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {sessionsOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
          onClick={() => setSessionsOpen(false)}
          aria-label="Close conversations"
        />
      ) : null}

      <Card className="flex min-h-[760px] min-w-0 flex-col overflow-hidden border-primary/10 shadow-lg">
        <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/12 via-background to-violet-500/10 p-4 sm:p-5">
          <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 xl:hidden"
              onClick={() => setSessionsOpen(true)}
              aria-label="Open conversations"
            >
              <MoreHorizontal className="h-5 w-5" />
            </Button>
            <span className="relative grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Mascot mascot="leo" state={leoState} size={44} />
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background',
                  status === 'online' ? 'bg-success' : status === 'checking' ? 'bg-warning' : 'bg-destructive',
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold sm:text-xl">LEO AI Tutor</h1>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    status === 'online'
                      ? 'border-success/25 bg-success/10 text-success'
                      : 'border-destructive/25 bg-destructive/10 text-destructive',
                  )}
                >
                  {status === 'online' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {status === 'checking' ? 'Checking' : status === 'online' ? 'AI online' : 'AI unavailable'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {phaseLabel || activeSession?.title || 'Your syllabus-aware learning companion'}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {firstTokenMs !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-warning" />
                  First words {(firstTokenMs / 1000).toFixed(1)}s
                </span>
              ) : null}
              {totalMs !== null ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {(totalMs / 1000).toFixed(1)}s total
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative mt-4 grid gap-2 md:grid-cols-2">
            <Select value={mode} onValueChange={(value) => setMode(value as TutorMode)} disabled={busy}>
              <SelectTrigger className="bg-background/75">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TUTOR_MODES.map((item) => (
                  <SelectItem key={item.key} value={item.key}>
                    {item.label} — {item.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={subjectId || 'all'}
              onValueChange={(value) => setSubjectId(value === 'all' ? '' : value)}
              disabled={busy}
            >
              <SelectTrigger className="bg-background/75">
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative mt-3 flex gap-2 overflow-x-auto pb-1">
            {FEATURED_MODES.map((item) => {
              const config = TUTOR_MODES.find((entry) => entry.key === item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  disabled={busy}
                  className={cn(
                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                    mode === item
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {config?.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/15 to-background p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[450px] max-w-4xl flex-col items-center justify-center text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
                <div className="relative rounded-3xl border border-primary/15 bg-background/80 p-3 shadow-xl">
                  <Mascot mascot="leo" state={leoState} size={92} />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Learn faster with a tutor that adapts</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Ask a doubt, paste code, practise a viva, check an answer, or turn any topic into exam-ready notes.
              </p>
              <div className="mt-6 grid w-full max-w-3xl gap-3 sm:grid-cols-2">
                {QUICK_STARTS.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => {
                      setMode(item.mode)
                      setDraft(item.prompt)
                      window.setTimeout(() => composerRef.current?.focus(), 0)
                    }}
                    className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <p className="mt-3 text-sm font-bold">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5">
              {messages.map((item, index) =>
                item.role === 'user' ? (
                  <div key={item.id} className="flex justify-end ai-message-enter">
                    <div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm sm:max-w-[78%]">
                      {item.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessage
                    key={item.id}
                    message={item}
                    streaming={busy && index === messages.length - 1}
                    copied={copiedId === item.id}
                    voiceLoading={voiceLoading}
                    voicePlaying={playing}
                    onCopy={() => void copyMessage(item)}
                    onSpeak={() => (playing ? stopVoice() : void play(item.content))}
                    onFollowUp={(prompt) => void send(prompt)}
                    onRegenerate={retryLast}
                  />
                ),
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        <div className="border-t bg-background/95 p-3 backdrop-blur sm:p-4">
          <div className="mx-auto max-w-4xl">
            {error ? (
              <div
                className="mb-3 flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">Message was not sent</p>
                  <p className="mt-0.5 break-words">{error}</p>
                </div>
                {lastPromptRef.current ? (
                  <Button type="button" variant="outline" size="sm" onClick={retryLast} disabled={busy} className="shrink-0 gap-1.5">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}

            <form onSubmit={submitComposer} className="rounded-2xl border border-border bg-card p-2 shadow-lg transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
              <Textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, 8000))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder={`Ask LEO in ${selectedMode?.label || 'your preferred mode'}…`}
                className="min-h-[88px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={busy}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Gauge className="h-3.5 w-3.5" />
                    Live streaming
                  </span>
                  <span>{draft.length}/8000</span>
                  {subject ? <span className="hidden sm:inline">Context: {subject.code}</span> : null}
                  {status !== 'online' ? <span className="hidden sm:inline">Send will retry the connection</span> : null}
                </div>
                {busy ? (
                  <Button type="button" variant="destructive" size="sm" onClick={stopGeneration} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!draft.trim()}
                    className="gap-1.5"
                    aria-label="Send message to LEO"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </Button>
                )}
              </div>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              LEO can make mistakes. Verify formulas, code, and important exam facts with approved course material.
            </p>
            {voiceError ? <p className="mt-1 text-center text-xs text-destructive">Voice: {voiceError}</p> : null}
          </div>
        </div>
      </Card>
    </div>
  )
}

function AssistantMessage({
  message,
  streaming,
  copied,
  voiceLoading,
  voicePlaying,
  onCopy,
  onSpeak,
  onFollowUp,
  onRegenerate,
}: {
  message: TutorMessage
  streaming: boolean
  copied: boolean
  voiceLoading: boolean
  voicePlaying: boolean
  onCopy: () => void
  onSpeak: () => void
  onFollowUp: (prompt: string) => void
  onRegenerate: () => void
}) {
  const followUps = parseStringArray(message.followUps).slice(0, 3)
  const citations = parseCitations(message.citations)

  return (
    <article className="ai-message-enter overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <header className="flex items-center gap-2 border-b border-border/60 bg-gradient-to-r from-primary/6 to-transparent px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-foreground">LEO</p>
          <p className="text-[10px] capitalize text-muted-foreground">
            {(message.mode || 'explain_simple').replaceAll('_', ' ')}
            {message.groundingStatus ? ` · ${message.groundingStatus.replaceAll('_', ' ')}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy} aria-label="Copy response">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Clipboard className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSpeak}
            disabled={!message.content || voiceLoading || streaming}
            aria-label={voicePlaying ? 'Stop voice' : 'Read response aloud'}
          >
            {voicePlaying ? <VolumeX className="h-3.5 w-3.5" /> : voiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onRegenerate}
            disabled={streaming}
            aria-label="Regenerate response"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-5">
        {message.content ? (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:scroll-mt-20 prose-pre:overflow-x-auto">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {streaming ? <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" /> : null}
          </div>
        ) : streaming ? (
          <div className="space-y-2 py-2" aria-label="LEO is beginning the response">
            <span className="block h-3 w-4/5 animate-pulse rounded bg-muted" />
            <span className="block h-3 w-3/5 animate-pulse rounded bg-muted [animation-delay:120ms]" />
            <span className="block h-3 w-2/3 animate-pulse rounded bg-muted [animation-delay:240ms]" />
          </div>
        ) : null}

        {citations.length > 0 && !streaming ? (
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Course sources</p>
            <div className="flex flex-wrap gap-2">
              {citations.map((citation, index) => (
                <span
                  key={`${citation.sourceId}-${index}`}
                  className="rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                  title={citation.location}
                >
                  [{index + 1}] {citation.title}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {followUps.length > 0 && !streaming ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {followUps.map((followUp) => (
              <button
                key={followUp}
                type="button"
                onClick={() => onFollowUp(followUp)}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {followUp}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
