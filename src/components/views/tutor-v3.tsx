'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  AlertCircle,
  Brain,
  Check,
  ChevronRight,
  Clipboard,
  Loader2,
  MessageSquarePlus,
  RefreshCcw,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTtsPlayer } from '@/hooks/use-tts-player'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { cn } from '@/lib/utils'
import { TUTOR_MODES, type TutorMessage, type TutorMode, type TutorSession } from '@/lib/types'

export interface AcademicTutorContext {
  profileLabel?: string
  subjectName?: string
  chapterName?: string
  topicName?: string
  examLabel?: string
}

const ACADEMIC_MODES: TutorMode[] = [
  'explain_simple',
  'explain_deep',
  'hint_only',
  'ask_me',
  'check_answer',
  'exam_answer',
  'short_notes',
  'compare_concepts',
  'generate_flashcards',
  'review_weak_topics',
]

const QUICK_STARTS: Array<{ title: string; prompt: string; mode: TutorMode }> = [
  { title: 'Teach from basics', prompt: 'Teach me this concept from the basics, then check whether I understood it: ', mode: 'explain_simple' },
  { title: 'Solve with me', prompt: 'Help me solve this step by step. Start with the concept and give me only the next step unless I ask for the full solution:\n\n', mode: 'hint_only' },
  { title: 'Quiz me', prompt: 'Quiz me on this topic one question at a time and adapt the difficulty to my answers: ', mode: 'ask_me' },
  { title: 'Review my mistake', prompt: 'I got this question wrong. Identify whether the issue is conceptual, formula-based, calculation, careless, or time-pressure related, then help me fix it:\n\n', mode: 'check_answer' },
]

type Phase = 'idle' | 'creating' | 'connecting' | 'streaming'

function clientMessageId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function json(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>
}

function apiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

function followUps(value?: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 3) : []
  } catch {
    return []
  }
}

function academicMode(mode?: string | null): TutorMode {
  return ACADEMIC_MODES.includes(mode as TutorMode) ? (mode as TutorMode) : 'explain_simple'
}

export function TutorView({ academicContext }: { academicContext?: AcademicTutorContext }) {
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [draft, setDraft] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const lastPromptRef = useRef('')
  const { playing, loading: voiceLoading, error: voiceError, play, stop: stopVoice } = useTtsPlayer()

  const selectedMode = useMemo(() => TUTOR_MODES.find((item) => item.key === mode), [mode])
  const contextLabel = [academicContext?.profileLabel, academicContext?.subjectName, academicContext?.chapterName, academicContext?.topicName]
    .filter(Boolean)
    .join(' · ')
  const busy = phase !== 'idle'

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [sessionsResult, statusResult] = await Promise.allSettled([
        fetch('/api/tutor/session', { cache: 'no-store' }),
        fetch('/api/ai/status', { cache: 'no-store' }),
      ])
      if (cancelled) return

      if (sessionsResult.status === 'fulfilled') {
        const payload = await json(sessionsResult.value)
        if (sessionsResult.value.ok && (payload as { ok?: boolean })?.ok) {
          // Historical diploma sessions with a stored legacy subjectId are not
          // injected into the transformed Tutor. They remain in the database
          // for migration/archive work but cannot leak old academic scope here.
          const loaded = (((payload as { data?: TutorSession[] }).data || []) as TutorSession[])
            .filter((item) => !item.subjectId)
          setSessions(loaded)
          if (loaded[0]) {
            setSessionId(loaded[0].id)
            setMessages(loaded[0].messages || [])
            setMode(academicMode(loaded[0].mode))
          }
        }
      }

      if (statusResult.status === 'fulfilled') {
        const payload = await json(statusResult.value)
        setAiAvailable(Boolean((payload as { ok?: boolean; data?: { available?: boolean } })?.ok && (payload as { data?: { available?: boolean } }).data?.available))
      } else {
        setAiAvailable(false)
      }
    }
    void load()
    return () => {
      cancelled = true
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [messages, phase, error])

  async function createSession(signal?: AbortSignal) {
    const response = await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({ title: 'New session', mode }),
    })
    const payload = await json(response)
    if (!response.ok || !(payload as { ok?: boolean })?.ok) {
      throw new Error(apiError(payload, 'Could not start a tutor conversation.'))
    }
    const session = (payload as { data?: TutorSession }).data
    if (!session?.id) throw new Error('The tutor session was created without a valid ID.')
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
    setSessionId(session.id)
    return session
  }

  async function newSession() {
    if (busy) return
    setError('')
    setPhase('creating')
    try {
      await createSession()
      setMessages([])
      window.setTimeout(() => composerRef.current?.focus(), 0)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start a new conversation.')
    } finally {
      setPhase('idle')
    }
  }

  function switchSession(session: TutorSession) {
    abortRef.current?.abort()
    stopVoice()
    setSessionId(session.id)
    setMessages(session.messages || [])
    setMode(academicMode(session.mode))
    setError('')
    setSessionsOpen(false)
  }

  async function deleteSession(session: TutorSession) {
    if (busy) return
    const response = await fetch(`/api/tutor/session?sessionId=${encodeURIComponent(session.id)}`, { method: 'DELETE' })
    const payload = await json(response)
    if (!response.ok || !(payload as { ok?: boolean })?.ok) {
      setError(apiError(payload, 'Could not delete this conversation.'))
      return
    }
    const next = sessions.filter((item) => item.id !== session.id)
    setSessions(next)
    if (sessionId === session.id) {
      setSessionId(next[0]?.id || '')
      setMessages(next[0]?.messages || [])
      setMode(academicMode(next[0]?.mode))
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

    const activeMode = academicMode(forcedMode || mode)
    if (forcedMode) setMode(activeMode)
    sendingRef.current = true
    setError('')
    setPhase(sessionId ? 'connecting' : 'creating')

    const controller = new AbortController()
    abortRef.current = controller
    let id = sessionId
    let streamId = ''
    let userMessage: TutorMessage | null = null

    try {
      if (!id) id = (await createSession(controller.signal)).id
      const messageId = clientMessageId()
      streamId = `stream-${messageId}`
      userMessage = { id: messageId, clientMessageId: messageId, role: 'user', content: clean, mode: activeMode }
      lastPromptRef.current = clean
      setDraft('')
      setMessages((current) => [...current, userMessage!, { id: streamId, clientMessageId: messageId, role: 'assistant', content: '', mode: activeMode }])
      setPhase('connecting')

      let completed = false
      let streamFailure = ''
      const response = await fetch('/api/tutor/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId: id,
          clientMessageId: messageId,
          message: clean,
          mode: activeMode,
          subjectName: academicContext?.subjectName,
          unitTitle: academicContext?.chapterName,
          topicTitle: academicContext?.topicName,
        }),
      })

      await consumeTutorStream(response, (event: TutorStreamEvent) => {
        if (event.type === 'delta') {
          setPhase('streaming')
          setMessages((current) => current.map((item) => item.id === streamId ? { ...item, content: `${item.content}${event.text}` } : item))
        } else if (event.type === 'done') {
          completed = true
          setMessages((current) => current.map((item) => item.id === streamId ? event.message : item))
          setSessions((current) => current.map((item) => item.id === id ? {
            ...item,
            title: event.sessionTitle || item.title,
            mode: activeMode,
            messages: [...(item.messages || []), userMessage!, event.message],
          } : item))
          setAiAvailable(true)
        } else if (event.type === 'error') {
          streamFailure = event.message
        }
      })

      if (streamFailure) throw new Error(streamFailure)
      if (!completed) throw new Error('LEO ended the response early. Please retry.')
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : 'LEO could not answer right now.')
        setDraft((current) => current || clean)
      }
      if (streamId) setMessages((current) => current.filter((item) => item.id !== streamId || item.content.trim().length > 0))
    } finally {
      abortRef.current = null
      sendingRef.current = false
      setPhase('idle')
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send()
  }

  async function copy(message: TutorMessage) {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId(null), 1400)
    } catch {
      setError('Could not copy this response.')
    }
  }

  return (
    <div className="grid min-h-[680px] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className={cn('fixed inset-y-0 left-0 z-50 w-[min(310px,86vw)] overflow-y-auto rounded-none p-3 shadow-2xl transition-transform lg:static lg:z-auto lg:w-auto lg:translate-x-0 lg:rounded-2xl', sessionsOpen ? 'translate-x-0' : '-translate-x-full')}>
        <Button type="button" className="w-full gap-2" onClick={() => void newSession()} disabled={busy}><MessageSquarePlus className="h-4 w-4" /> New conversation</Button>
        <p className="mt-4 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Recent conversations</p>
        <div className="mt-2 space-y-1">
          {sessions.length === 0 && <div className="rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">Your new Class 11/12/JEE tutor conversations will appear here.</div>}
          {sessions.map((session) => (
            <div key={session.id} className={cn('group flex items-start gap-1 rounded-xl border p-1', session.id === sessionId ? 'border-primary/25 bg-primary/10' : 'border-transparent hover:bg-muted/50')}>
              <button type="button" onClick={() => switchSession(session)} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left"><span className="line-clamp-2 text-sm font-semibold">{session.title}</span><span className="mt-1 block text-[10px] capitalize text-muted-foreground">{academicMode(session.mode).replaceAll('_', ' ')}</span></button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-60 group-hover:opacity-100" onClick={() => void deleteSession(session)} aria-label={`Delete ${session.title}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
        </div>
      </Card>

      {sessionsOpen && <button type="button" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSessionsOpen(false)} aria-label="Close conversations" />}

      <Card className="flex min-h-[680px] min-w-0 flex-col overflow-hidden rounded-2xl border-primary/10">
        <header className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-background p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="icon" className="lg:hidden" onClick={() => setSessionsOpen(true)} aria-label="Open conversations"><ChevronRight className="h-4 w-4" /></Button>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10"><Brain className="h-5 w-5 text-primary" /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">LEO AI Tutor</h2><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', aiAvailable === true ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : aiAvailable === false ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>{aiAvailable === true ? 'AI online' : aiAvailable === false ? 'AI unavailable' : 'Checking'}</span></div><p className="mt-0.5 truncate text-xs text-muted-foreground">{contextLabel || 'Your Class 11, Class 12 and JEE learning companion'}</p></div>
          </div>

          {contextLabel && <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs"><span className="font-semibold text-primary">Current study context:</span> <span className="text-muted-foreground">{contextLabel}</span>{academicContext?.examLabel ? <span className="text-muted-foreground"> · {academicContext.examLabel}</span> : null}</div>}

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {ACADEMIC_MODES.map((key) => {
              const item = TUTOR_MODES.find((entry) => entry.key === key)
              if (!item) return null
              return <button key={key} type="button" disabled={busy} onClick={() => setMode(key)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold', mode === key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground')}>{item.label}</button>
            })}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-muted/10 p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-[430px] max-w-3xl flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10"><Sparkles className="h-7 w-7 text-primary" /></div>
              <h2 className="mt-5 text-2xl font-bold">How do you want to learn this?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Ask a concept doubt, solve a problem together, request only a hint, get quizzed, or review a mistake. LEO keeps the current academic context when you open it from a chapter.</p>
              <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
                {QUICK_STARTS.map((item) => <button key={item.title} type="button" onClick={() => { setMode(item.mode); setDraft(item.prompt); window.setTimeout(() => composerRef.current?.focus(), 0) }} className="rounded-2xl border border-border bg-card p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35"><Sparkles className="h-4 w-4 text-primary" /><p className="mt-3 text-sm font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.prompt}</p></button>)}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-5">
              {messages.map((message, index) => message.role === 'user' ? (
                <div key={message.id} className="flex justify-end"><div className="max-w-[88%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground sm:max-w-[78%]">{message.content}</div></div>
              ) : (
                <AcademicAssistantMessage key={message.id} message={message} streaming={busy && index === messages.length - 1} copied={copiedId === message.id} voiceLoading={voiceLoading} voicePlaying={playing} onCopy={() => void copy(message)} onSpeak={() => playing ? stopVoice() : void play(message.content)} onFollowUp={(prompt) => void send(prompt)} onRegenerate={() => lastPromptRef.current && void send(lastPromptRef.current)} />
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <footer className="border-t border-border bg-background/95 p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}
            <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-2 shadow-sm focus-within:border-primary/40">
              <Textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 8000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder={`Ask LEO · ${selectedMode?.label ?? 'Learn'}`} disabled={busy} className="min-h-[86px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" />
              <div className="flex items-center justify-between gap-2 px-1 pb-1"><span className="text-[10px] text-muted-foreground">{phase === 'creating' ? 'Starting conversation…' : phase === 'connecting' ? 'Connecting…' : phase === 'streaming' ? 'Answering live…' : `${draft.length}/8000`}</span>{busy ? <Button type="button" variant="destructive" size="sm" onClick={stopGeneration} className="gap-1.5"><Square className="h-3.5 w-3.5" /> Stop</Button> : <Button type="submit" size="sm" disabled={!draft.trim()} className="gap-1.5"><Send className="h-3.5 w-3.5" /> Send</Button>}</div>
            </form>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">LEO can make mistakes. Verify important formulas, derivations and exam rules with approved academic sources.</p>
            {voiceError && <p className="mt-1 text-center text-xs text-destructive">Voice: {voiceError}</p>}
          </div>
        </footer>
      </Card>
    </div>
  )
}

function AcademicAssistantMessage({ message, streaming, copied, voiceLoading, voicePlaying, onCopy, onSpeak, onFollowUp, onRegenerate }: {
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
  const suggestions = followUps(message.followUps)
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold">LEO</p><p className="text-[10px] capitalize text-muted-foreground">{academicMode(message.mode).replaceAll('_', ' ')}</p></div><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy} aria-label="Copy response">{copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}</Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onSpeak} disabled={!message.content || voiceLoading || streaming} aria-label={voicePlaying ? 'Stop voice' : 'Read response aloud'}>{voicePlaying ? <VolumeX className="h-3.5 w-3.5" /> : voiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}</Button><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onRegenerate} disabled={streaming} aria-label="Regenerate response"><RefreshCcw className="h-3.5 w-3.5" /></Button></header>
      <div className="p-4 sm:p-5">{message.content ? <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:overflow-x-auto"><ReactMarkdown>{message.content}</ReactMarkdown>{streaming && <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />}</div> : streaming ? <div className="space-y-2"><span className="block h-3 w-3/4 animate-pulse rounded bg-muted" /><span className="block h-3 w-1/2 animate-pulse rounded bg-muted" /></div> : null}{suggestions.length > 0 && !streaming ? <div className="mt-5 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => onFollowUp(suggestion)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground">{suggestion}</button>)}</div> : null}</div>
    </article>
  )
}
