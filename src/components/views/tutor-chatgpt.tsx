'use client'

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import {
  AlertCircle,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  Clipboard,
  Code2,
  FileText,
  GraduationCap,
  Loader2,
  Menu,
  MessageSquarePlus,
  Paperclip,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTtsPlayer } from '@/hooks/use-tts-player'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { cn } from '@/lib/utils'
import {
  TUTOR_MODES,
  type Subject,
  type TutorMessage,
  type TutorMode,
  type TutorSession,
} from '@/lib/types'

interface TutorWorkspaceProps {
  initialSubjects?: Subject[]
  userName?: string
}

interface TextAttachment {
  id: string
  name: string
  content: string
  size: number
}

type AiStatus = 'checking' | 'online' | 'not_configured' | 'offline'
type Phase = 'idle' | 'loading_sessions' | 'creating_session' | 'connecting' | 'streaming'

const MAX_DRAFT_LENGTH = 7600
const MAX_FILE_BYTES = 96 * 1024
const DRAFT_STORAGE_KEY = 'lernio:leo:draft-v2'
const TEXT_FILE_EXTENSIONS = [
  '.txt', '.md', '.csv', '.json', '.c', '.cpp', '.h', '.hpp', '.java', '.py',
  '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.sql', '.xml', '.yaml', '.yml',
]

const STARTERS: Array<{
  title: string
  description: string
  prompt: string
  mode: TutorMode
  icon: typeof BookOpen
}> = [
  {
    title: 'Teach this simply',
    description: 'Build the idea step by step with one practical example.',
    prompt: 'Explain this simply from the beginning: ',
    mode: 'explain_simple',
    icon: BookOpen,
  },
  {
    title: 'Prepare an exam answer',
    description: 'Create a properly structured, marks-oriented response.',
    prompt: 'Write an exam-ready answer for: ',
    mode: 'exam_answer',
    icon: GraduationCap,
  },
  {
    title: 'Debug code with me',
    description: 'Find the smallest real fix and explain why it works.',
    prompt: 'Debug this code. Show the issue, the correction, and the reasoning:\n\n',
    mode: 'debug_code',
    icon: Code2,
  },
  {
    title: 'Test my understanding',
    description: 'Ask one question at a time and adapt to my answer.',
    prompt: 'Quiz me one question at a time on: ',
    mode: 'ask_me',
    icon: BrainCircuit,
  },
]

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function readJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>
}

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const raw = (payload as { error?: unknown }).error
  if (typeof raw === 'string' && raw.trim()) return raw
  if (raw && typeof raw === 'object') {
    const message = (raw as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
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
      .slice(0, 8)
  } catch {
    return []
  }
}

function isAcceptedTextFile(file: File) {
  const lower = file.name.toLowerCase()
  return file.type.startsWith('text/') || TEXT_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  return `${Math.round(bytes / 1024)} KB`
}

function formatSessionDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return 'Today'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TutorChatGPTWorkspace({ initialSubjects = [], userName = 'Learner' }: TutorWorkspaceProps) {
  const searchParams = useSearchParams()
  const querySubject = searchParams.get('subject')?.trim() || ''
  const queryLesson = searchParams.get('lesson')?.trim() || ''
  const queryUnit = searchParams.get('unit')?.trim() || searchParams.get('unitTitle')?.trim() || ''
  const queryUnitNumber = Number.parseInt(searchParams.get('unitNumber') || '', 10)
  const queryPrompt = searchParams.get('prompt')?.trim() || ''

  const [subjects] = useState(initialSubjects)
  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [sessionId, setSessionId] = useState('')
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [subjectId, setSubjectId] = useState('')
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<TextAttachment[]>([])
  const [phase, setPhase] = useState<Phase>('loading_sessions')
  const [status, setStatus] = useState<AiStatus>('checking')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionSearch, setSessionSearch] = useState('')
  const [contextOpen, setContextOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)
  const composerRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const lastPromptRef = useRef('')
  const didApplyQueryRef = useRef(false)
  const { playing, loading: voiceLoading, error: voiceError, play, stop: stopVoice } = useTtsPlayer()

  const busy = phase === 'creating_session' || phase === 'connecting' || phase === 'streaming'
  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === subjectId),
    [subjectId, subjects],
  )
  const selectedMode = useMemo(
    () => TUTOR_MODES.find((item) => item.key === mode),
    [mode],
  )
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === sessionId),
    [sessionId, sessions],
  )
  const filteredSessions = useMemo(() => {
    const query = sessionSearch.trim().toLowerCase()
    if (!query) return sessions
    return sessions.filter((session) => session.title.toLowerCase().includes(query))
  }, [sessionSearch, sessions])
  const contextSubjectName = selectedSubject?.name || querySubject
  const contextSubjectCode = selectedSubject?.code || querySubject
  const hasRouteContext = Boolean(contextSubjectName || queryLesson || queryUnit || Number.isInteger(queryUnitNumber))
  const firstName = userName.trim().split(/\s+/)[0] || 'Learner'

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (stored) setDraft(stored.slice(0, MAX_DRAFT_LENGTH))
    } catch {
      // Draft persistence is optional.
    }
  }, [])

  useEffect(() => {
    try {
      if (draft) window.localStorage.setItem(DRAFT_STORAGE_KEY, draft)
      else window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // Keep the in-memory draft when storage is unavailable.
    }
  }, [draft])

  useEffect(() => {
    if (didApplyQueryRef.current) return
    const matchedSubject = subjects.find((subject) => {
      const candidates = [subject.id, subject.code, subject.name].map((value) => value.toLowerCase())
      return candidates.includes(querySubject.toLowerCase())
    })
    if (matchedSubject) setSubjectId(matchedSubject.id)
    if (queryPrompt) setDraft(queryPrompt.slice(0, MAX_DRAFT_LENGTH))
    else if (queryLesson) setDraft(`Help me understand ${queryLesson}. `)
    didApplyQueryRef.current = true
  }, [queryLesson, queryPrompt, querySubject, subjects])

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 10_000)

    async function initialise() {
      const [sessionsResult, statusResult] = await Promise.allSettled([
        fetch('/api/tutor/session', { cache: 'no-store', signal: controller.signal }),
        fetch('/api/ai/status', { cache: 'no-store', signal: controller.signal }),
      ])
      if (cancelled) return

      if (sessionsResult.status === 'fulfilled') {
        const payload = await readJson(sessionsResult.value)
        if (sessionsResult.value.ok && (payload as { ok?: boolean })?.ok) {
          const loaded = ((payload as { data?: TutorSession[] }).data || []) as TutorSession[]
          setSessions(loaded)
          if (!hasRouteContext && loaded[0]) {
            setSessionId(loaded[0].id)
            setMessages(loaded[0].messages || [])
            setMode((loaded[0].mode as TutorMode) || 'explain_simple')
            setSubjectId(loaded[0].subjectId || '')
          }
        } else {
          setError(getApiErrorMessage(payload, 'Your previous chats could not be loaded. You can still start a new chat.'))
        }
      } else if ((sessionsResult.reason as Error)?.name !== 'AbortError') {
        setError('Your previous chats could not be loaded. You can still start a new chat.')
      }

      if (statusResult.status === 'fulfilled') {
        const payload = await readJson(statusResult.value)
        const ok = Boolean((payload as { ok?: boolean })?.ok)
        const available = Boolean((payload as { data?: { available?: boolean } })?.data?.available)
        setStatus(available ? 'online' : ok ? 'not_configured' : 'offline')
      } else {
        setStatus('offline')
      }
      setPhase('idle')
    }

    void initialise()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
      abortRef.current?.abort()
    }
  }, [hasRouteContext])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: phase === 'streaming' ? 'auto' : 'smooth', block: 'end' })
  }, [messages, phase])

  function startNewChat() {
    if (busy) return
    stopVoice()
    setSessionId('')
    setMessages([])
    setError('')
    setSidebarOpen(false)
    window.setTimeout(() => composerRef.current?.focus(), 0)
  }

  function switchSession(session: TutorSession) {
    abortRef.current?.abort()
    stopVoice()
    setSessionId(session.id)
    setMessages(session.messages || [])
    setMode((session.mode as TutorMode) || 'explain_simple')
    setSubjectId(session.subjectId || '')
    setError('')
    setSidebarOpen(false)
  }

  function changeSubject(value: string) {
    const next = value === 'all' ? '' : value
    if (next === subjectId) return
    setSubjectId(next)
    if (messages.length > 0 || sessionId) {
      setSessionId('')
      setMessages([])
      setError('A new chat was started so answers do not mix two subjects.')
    }
  }

  async function deleteSession(session: TutorSession) {
    if (busy) return
    const response = await fetch(`/api/tutor/session?sessionId=${encodeURIComponent(session.id)}`, {
      method: 'DELETE',
    }).catch(() => null)
    if (!response) {
      setError('Could not delete that chat. Check your connection and retry.')
      return
    }
    const payload = await readJson(response)
    if (!response.ok || !(payload as { ok?: boolean })?.ok) {
      setError(getApiErrorMessage(payload, 'Could not delete that chat.'))
      return
    }

    const remaining = sessions.filter((item) => item.id !== session.id)
    setSessions(remaining)
    if (session.id === sessionId) startNewChat()
  }

  async function createSession(signal: AbortSignal) {
    const response = await fetch('/api/tutor/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        title: 'New session',
        mode,
        subjectId: subjectId || undefined,
        unitNumber: subjectId && Number.isInteger(queryUnitNumber) ? queryUnitNumber : undefined,
      }),
    })
    const payload = await readJson(response)
    if (!response.ok || !(payload as { ok?: boolean })?.ok) {
      throw new Error(getApiErrorMessage(payload, `Could not start a new chat (${response.status}).`))
    }
    const session = (payload as { data?: TutorSession }).data
    if (!session?.id) throw new Error('The chat was created without a valid session ID.')
    setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
    setSessionId(session.id)
    return session
  }

  function stopGeneration() {
    abortRef.current?.abort('user_stop')
    abortRef.current = null
    sendingRef.current = false
    setPhase('idle')
  }

  function buildMessageText() {
    const cleanDraft = draft.trim()
    const available = Math.max(0, 8000 - cleanDraft.length - 120)
    const attachmentBlock = attachments
      .map((attachment) => `\n\n--- Attached file: ${attachment.name} ---\n${attachment.content}`)
      .join('')
      .slice(0, available)
    return `${cleanDraft}${attachmentBlock}`.trim().slice(0, 8000)
  }

  async function send(textOverride?: string, forcedMode?: TutorMode) {
    const clean = (textOverride ?? buildMessageText()).trim()
    if (!clean || sendingRef.current) return

    sendingRef.current = true
    const controller = new AbortController()
    abortRef.current = controller
    const sessionTimer = window.setTimeout(() => controller.abort('session_timeout'), 20_000)
    const activeMode = forcedMode || mode
    if (forcedMode) setMode(forcedMode)

    let id = sessionId
    let streamMessageId = ''
    let optimisticAdded = false

    setError('')
    setPhase(id ? 'connecting' : 'creating_session')

    try {
      if (!id) {
        const session = await createSession(controller.signal)
        id = session.id
      }
      window.clearTimeout(sessionTimer)

      const clientMessageId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : createId('request').replace('request-', '').padEnd(36, '0').slice(0, 36)
      const userMessage: TutorMessage = {
        id: createId('user'),
        clientMessageId,
        role: 'user',
        content: clean,
        mode: activeMode,
      }
      streamMessageId = createId('assistant-stream')
      lastPromptRef.current = clean
      setDraft('')
      setAttachments([])
      setMessages((current) => [
        ...current,
        userMessage,
        { id: streamMessageId, clientMessageId, role: 'assistant', content: '', mode: activeMode },
      ])
      optimisticAdded = true

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
          subjectName: contextSubjectName || undefined,
          unitTitle: queryUnit || (Number.isInteger(queryUnitNumber) ? `Unit ${queryUnitNumber}` : undefined),
          topicTitle: queryLesson || undefined,
        }),
      })

      await consumeTutorStream(response, (event: TutorStreamEvent) => {
        if (event.type === 'delta') {
          setPhase('streaming')
          setMessages((current) => current.map((message) =>
            message.id === streamMessageId
              ? { ...message, content: `${message.content}${event.text}` }
              : message,
          ))
        } else if (event.type === 'done') {
          completed = true
          setMessages((current) => current.map((message) =>
            message.id === streamMessageId ? event.message : message,
          ))
          setSessions((current) => current.map((session) =>
            session.id === id
              ? {
                  ...session,
                  title: event.sessionTitle || session.title,
                  mode: activeMode,
                  messages: [...(session.messages || []), userMessage, event.message],
                }
              : session,
          ))
        } else if (event.type === 'error') {
          streamFailure = event.message
        }
      })

      if (streamFailure) throw new Error(streamFailure)
      if (!completed) throw new Error('LEO stopped before finishing the answer. Your question is still here—press Retry.')
      setStatus('online')
    } catch (sendError) {
      const aborted = controller.signal.aborted || (sendError as Error).name === 'AbortError'
      if (controller.signal.reason === 'user_stop') {
        setError('Generation stopped. You can edit the question or retry it.')
      } else if (controller.signal.reason === 'session_timeout') {
        setError('Starting the chat took too long. Check your connection and retry.')
      } else if (!aborted) {
        setError(sendError instanceof Error ? sendError.message : 'LEO could not answer right now.')
      }
      if (optimisticAdded && streamMessageId) {
        setMessages((current) => current.filter((message) =>
          message.id !== streamMessageId || message.content.trim().length > 0,
        ))
      }
    } finally {
      window.clearTimeout(sessionTimer)
      abortRef.current = null
      sendingRef.current = false
      setPhase('idle')
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send()
  }

  async function copyMessage(message: TutorMessage) {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedId(message.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setError('Copy failed. Select the response text and copy it manually.')
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, 3)
    event.target.value = ''
    if (files.length === 0) return

    const accepted: TextAttachment[] = []
    for (const file of files) {
      if (!isAcceptedTextFile(file)) {
        setError(`${file.name} is not a readable text/code file. PDF and image understanding is not enabled yet.`)
        continue
      }
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is too large. Keep each text/code file below ${formatBytes(MAX_FILE_BYTES)}.`)
        continue
      }
      try {
        const content = await file.text()
        accepted.push({ id: createId('attachment'), name: file.name, content, size: file.size })
      } catch {
        setError(`${file.name} could not be read.`)
      }
    }
    setAttachments((current) => [...current, ...accepted].slice(0, 3))
  }

  const statusLabel = status === 'online'
    ? 'Online'
    : status === 'checking'
      ? 'Checking'
      : status === 'not_configured'
        ? 'AI key required'
        : 'Offline'

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-background text-foreground md:h-[calc(100dvh-3.5rem)]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(320px,88vw)] flex-col border-r border-border bg-muted/35 p-3 shadow-2xl transition-transform md:static md:z-auto md:w-72 md:translate-x-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="LEO conversations"
      >
        <div className="flex items-center gap-2">
          <Button type="button" onClick={startNewChat} className="min-h-11 flex-1 justify-start gap-2 rounded-xl">
            <MessageSquarePlus className="h-4 w-4" /> New chat
          </Button>
          <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close conversations">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={sessionSearch}
            onChange={(event) => setSessionSearch(event.target.value)}
            placeholder="Search chats"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <div className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pb-4">
          {phase === 'loading_sessions' ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading chats…
            </div>
          ) : filteredSessions.length === 0 ? (
            <p className="px-3 py-5 text-sm leading-6 text-muted-foreground">
              {sessionSearch ? 'No chats match that search.' : 'Your conversations will appear here after you send the first message.'}
            </p>
          ) : filteredSessions.map((session) => (
            <div key={session.id} className={cn('group flex items-start gap-1 rounded-xl p-1', session.id === sessionId && 'bg-background shadow-sm')}>
              <button type="button" onClick={() => switchSession(session)} className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left">
                <span className="line-clamp-2 text-sm font-semibold">{session.title || 'New chat'}</span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{formatSessionDate(session.updatedAt)}</span>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                onClick={() => void deleteSession(session)}
                aria-label={`Delete ${session.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {status === 'online' ? <Wifi className="h-3.5 w-3.5 text-emerald-500" /> : <WifiOff className="h-3.5 w-3.5" />}
            <span>LEO {statusLabel}</span>
          </div>
          <p className="mt-2 leading-5">Chats use your selected subject and current lesson context.</p>
        </div>
      </aside>

      {sidebarOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/45 md:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close conversations" />
      ) : null}

      <section className="flex min-h-[calc(100dvh-3.5rem)] min-w-0 flex-1 flex-col md:min-h-0">
        <header className="flex min-h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur sm:px-4">
          <Button type="button" variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open conversations">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold sm:text-base">{activeSession?.title || 'LEO AI Tutor'}</h1>
              <span className={cn('hidden rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline', status === 'online' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground')}>
                {statusLabel}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">
              {contextSubjectCode ? `${contextSubjectCode}${queryLesson ? ` · ${queryLesson}` : ''}` : 'Syllabus-aware study assistant'}
            </p>
          </div>

          <div className="hidden min-w-48 sm:block">
            <Select value={subjectId || 'all'} onValueChange={changeSubject} disabled={busy}>
              <SelectTrigger className="h-9 rounded-xl bg-background text-xs">
                <SelectValue placeholder="Choose subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">General learning</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.code} — {subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="ghost" size="icon" onClick={startNewChat} aria-label="Start a new chat">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-center text-2xl font-semibold tracking-tight sm:text-3xl">What are we learning, {firstName}?</h2>
              <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-6 text-muted-foreground">
                Ask naturally. LEO can explain, test you, check answers, create revision material, and debug code without turning every “hi” into a lecture.
              </p>

              {hasRouteContext ? (
                <div className="mx-auto mt-5 w-full max-w-xl rounded-2xl border border-primary/20 bg-primary/5 p-4 text-left">
                  <div className="flex items-start gap-3">
                    <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-primary">Current learning context</p>
                      <p className="mt-1 text-sm font-semibold">{contextSubjectName || 'Current subject'}{queryLesson ? ` · ${queryLesson}` : ''}</p>
                      {(queryUnit || Number.isInteger(queryUnitNumber)) && <p className="mt-1 text-xs text-muted-foreground">{queryUnit || `Unit ${queryUnitNumber}`}</p>}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {STARTERS.map((starter) => {
                  const Icon = starter.icon
                  return (
                    <button
                      key={starter.title}
                      type="button"
                      onClick={() => {
                        setMode(starter.mode)
                        setDraft(starter.prompt)
                        window.setTimeout(() => composerRef.current?.focus(), 0)
                      }}
                      className="rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent/40"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-3 text-sm font-bold">{starter.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{starter.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
              {messages.map((message, index) => (
                message.role === 'user' ? (
                  <UserMessage key={message.id} message={message} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    streaming={busy && index === messages.length - 1}
                    copied={copiedId === message.id}
                    voiceLoading={voiceLoading}
                    voicePlaying={playing}
                    onCopy={() => void copyMessage(message)}
                    onSpeak={() => playing ? stopVoice() : void play(message.content)}
                    onFollowUp={(prompt) => void send(prompt)}
                  />
                )
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5 md:pb-4">
          <div className="mx-auto max-w-3xl">
            {error ? (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs leading-5" role="alert">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="min-w-0 flex-1">{error}</span>
                {lastPromptRef.current && !busy ? (
                  <button type="button" className="font-bold text-primary" onClick={() => void send(lastPromptRef.current)}>Retry</button>
                ) : null}
                <button type="button" onClick={() => setError('')} aria-label="Dismiss message"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : null}

            {attachments.length > 0 ? (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="max-w-36 truncate font-semibold">{attachment.name}</span>
                    <span className="text-muted-foreground">{formatBytes(attachment.size)}</span>
                    <button type="button" onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} aria-label={`Remove ${attachment.name}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-2 shadow-lg transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/10">
              <Textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value.slice(0, MAX_DRAFT_LENGTH))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder={queryLesson ? `Ask anything about ${queryLesson}` : 'Message LEO'}
                className="min-h-[52px] max-h-48 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
                disabled={busy}
              />

              <div className="flex items-center justify-between gap-2 px-1 pb-1">
                <div className="flex min-w-0 items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    accept={TEXT_FILE_EXTENSIONS.join(',') + ',text/*'}
                    onChange={(event) => void handleFiles(event)}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => fileInputRef.current?.click()} disabled={busy || attachments.length >= 3} aria-label="Attach a text or code file">
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <div className="w-40 sm:w-48">
                    <Select value={mode} onValueChange={(value) => setMode(value as TutorMode)} disabled={busy}>
                      <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TUTOR_MODES.map((item) => (
                          <SelectItem key={item.key} value={item.key}>{item.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <button type="button" className="hidden items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted sm:flex" onClick={() => setContextOpen((current) => !current)}>
                    Context <ChevronDown className={cn('h-3 w-3 transition', contextOpen && 'rotate-180')} />
                  </button>
                </div>

                {busy ? (
                  <Button type="button" size="icon" variant="destructive" className="h-9 w-9 rounded-xl" onClick={stopGeneration} aria-label="Stop generating">
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button type="submit" size="icon" className="h-9 w-9 rounded-xl" disabled={!draft.trim() && attachments.length === 0} aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            {contextOpen ? (
              <div className="mt-2 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
                <p><strong className="text-foreground">Subject:</strong> {contextSubjectName || 'General learning'}</p>
                <p><strong className="text-foreground">Lesson:</strong> {queryLesson || 'Not selected'}</p>
                <p><strong className="text-foreground">Answer mode:</strong> {selectedMode?.label || mode}</p>
              </div>
            ) : null}

            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              LEO can make mistakes. Verify important formulas, code and exam facts with approved Materials.
            </p>
            {voiceError ? <p className="mt-1 text-center text-xs text-destructive">Voice: {voiceError}</p> : null}
          </div>
        </div>
      </section>
    </div>
  )
}

function UserMessage({ message }: { message: TutorMessage }) {
  const visible = message.content.split('\n\n--- Attached file:')[0]
  return (
    <div className="mb-7 flex justify-end">
      <div className="max-w-[88%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-muted px-4 py-3 text-sm leading-6 sm:max-w-[78%]">
        {visible}
      </div>
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
}: {
  message: TutorMessage
  streaming: boolean
  copied: boolean
  voiceLoading: boolean
  voicePlaying: boolean
  onCopy: () => void
  onSpeak: () => void
  onFollowUp: (prompt: string) => void
}) {
  const citations = parseCitations(message.citations)
  const followUps = parseStringArray(message.followUps).slice(0, 3)

  return (
    <article className="mb-9 grid grid-cols-[32px_minmax(0,1fr)] gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-bold">LEO</p>
          {message.groundingStatus ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">
              {message.groundingStatus.replaceAll('_', ' ')}
            </span>
          ) : null}
        </div>

        {message.content ? (
          <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-headings:font-bold prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:border prose-pre:border-border">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {streaming ? <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" /> : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {streaming ? 'Writing the answer…' : 'Preparing…'}
          </div>
        )}

        {!streaming && message.content ? (
          <div className="mt-3 flex items-center gap-1 text-muted-foreground">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onCopy} aria-label="Copy response">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Clipboard className="h-3.5 w-3.5" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onSpeak} disabled={voiceLoading} aria-label={voicePlaying ? 'Stop reading' : 'Read aloud'}>
              {voiceLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : voicePlaying ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </Button>
            <span className="ml-1 text-[10px] capitalize">{(message.mode || 'explain_simple').replaceAll('_', ' ')}</span>
          </div>
        ) : null}

        {citations.length > 0 && !streaming ? (
          <div className="mt-4 rounded-xl border border-border bg-muted/25 p-3">
            <p className="text-xs font-bold">Sources used</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {citations.map((citation) => (
                <span key={`${citation.sourceId}-${citation.title}`} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  {citation.title}{citation.location ? ` · ${citation.location}` : ''}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {followUps.length > 0 && !streaming ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {followUps.map((followUp) => (
              <button key={followUp} type="button" onClick={() => onFollowUp(followUp)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5">
                {followUp}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
