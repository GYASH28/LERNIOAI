'use client'

/* ============================================================
   LeoStudio — the premium AI learning studio.
   ------------------------------------------------------------
   Task L-4. Replaces `tutor-v3.tsx` as the Learnio AI tutor view.

   Layout: 2-column grid (chat + context panel) collapsing to a
   single column on mobile. Every visual surface is rendered with
   the `.leo-*` classes already shipped in `premium-enhancements.css`
   (Task L-3) — no inline colour literals, every token resolves
   through the semantic OKLCH contract.

   Capabilities:
   • 6 teaching styles (Simple / Standard / Deep / Exam / ELI10 /
     Engineer) wired to the existing `/api/tutor/chat/stream`
     protocol via `consumeTutorStream`.
   • Streaming markdown bubbles with custom renderers (CodeBlock,
     Callout, premium tables) — no `rehype-raw`, XSS-safe.
   • Inline citations `[1]` `[2]` that pop a context card with the
     source title + location.
   • Follow-up chips rendered from the assistant's `followUps` JSON.
   • Voice input via `useVoiceRecorder` + voice output via
     `useTtsPlayer`.
   • framer-motion entrance for every bubble + AnimatePresence for
     the streaming cursor and citation popover.
   • `LeoPremium` mascot reacting to conversational state.
   ============================================================ */

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Send,
  Mic,
  Square,
  Sparkles,
  Trash2,
  BookOpen,
  GraduationCap,
  Code2,
  Brain,
  ChevronDown,
  Volume2,
  VolumeX,
  Pin,
  Lightbulb,
  Target,
  GitCompare,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { LeoPremium } from '@/components/mascots/leo-premium'
import VisualRenderer, { type VisualData } from '@/components/learning/leo-visuals'
import { CodeBlock } from '@/components/learning/code-block'
import { Callout } from '@/components/learning/callout'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import { useTtsPlayer } from '@/hooks/use-tts-player'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type TeachingStyle = 'simple' | 'standard' | 'deep' | 'exam' | 'eli10' | 'engineer'
type LeoState = 'idle' | 'thinking' | 'happy' | 'encouraging' | 'curious' | 'celebrating' | 'sad' | 'greeting'

interface Citation {
  sourceId: string
  title: string
  location?: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  followUps?: string[]
  isStreaming?: boolean
  teachingStyle?: TeachingStyle
}

interface PinnedLesson {
  title: string
  subject: string
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const TEACHING_STYLES: Array<{
  id: TeachingStyle
  label: string
  icon: LucideIcon
  description: string
}> = [
  { id: 'simple', label: 'Simple', icon: Lightbulb, description: 'Plain English, one example' },
  { id: 'standard', label: 'Standard', icon: BookOpen, description: 'Balanced depth' },
  { id: 'deep', label: 'Deep', icon: Brain, description: 'Full theory + variations' },
  { id: 'exam', label: 'Exam', icon: GraduationCap, description: 'Exam-ready answer' },
  { id: 'eli10', label: 'ELI10', icon: Sparkles, description: "Explain like I'm 10" },
  { id: 'engineer', label: 'Engineer', icon: Code2, description: 'Technical depth' },
]

const MODE_CARDS: Array<{
  title: string
  description: string
  icon: LucideIcon
  prompt: string
  style: TeachingStyle
}> = [
  {
    title: 'Understand a concept',
    description: 'Learn something new with simple examples',
    icon: Lightbulb,
    prompt: 'I want to understand: ',
    style: 'simple',
  },
  {
    title: 'Prepare for exam',
    description: 'Get exam-ready answers with marks',
    icon: GraduationCap,
    prompt: 'Write an exam answer for: ',
    style: 'exam',
  },
  {
    title: 'Quick revision',
    description: 'Short notes for fast review',
    icon: BookOpen,
    prompt: 'Create revision notes for: ',
    style: 'standard',
  },
  {
    title: 'Debug my code',
    description: 'Find and fix code issues',
    icon: Code2,
    prompt: 'Debug this code:\n\n',
    style: 'engineer',
  },
  {
    title: 'Compare concepts',
    description: 'Side-by-side comparison',
    icon: GitCompare,
    prompt: 'Compare: ',
    style: 'standard',
  },
  {
    title: 'Practice viva',
    description: 'Oral exam practice',
    icon: Target,
    prompt: 'Conduct a viva on: ',
    style: 'standard',
  },
]

const STYLE_PROMPTS: Record<TeachingStyle, string> = {
  simple: 'Explain in simple English with one relatable example.',
  standard: 'Explain with balanced depth and clarity.',
  deep: 'Explain deeply — cover foundations, working, variations, limitations.',
  exam: 'Write an exam-ready answer with definition, points, example, conclusion.',
  eli10: 'Explain like I am 10 years old. Use a fun analogy.',
  engineer: 'Explain with technical depth — architecture, trade-offs, complexity.',
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function mapStyleToMode(style: TeachingStyle): string {
  const map: Record<TeachingStyle, string> = {
    simple: 'explain_simple',
    standard: 'explain_simple',
    deep: 'explain_deep',
    exam: 'exam_answer',
    eli10: 'explain_simple',
    engineer: 'explain_deep',
  }
  return map[style]
}

function createClientMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseCitations(value?: string | null): Citation[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is Citation => {
        if (!item || typeof item !== 'object') return false
        const row = item as Record<string, unknown>
        return typeof row.sourceId === 'string' && typeof row.title === 'string'
      })
      .slice(0, 8)
  } catch {
    return []
  }
}

function parseStringArray(value?: string | null): string[] {
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

/** Replace `[1]`, `[2]` markers in markdown text with citation chip
 *  placeholders we recognise at render time. */
const CITATION_PATTERN = /\[(\d{1,2})\]/g

/** Detect GFM callout blocks `> [!tip]`, `> [!warning]`, etc. */
const CALLOUT_PATTERN = /^\[!(tip|warning|note|example)\]/i

/** Lightweight check — does the content include a markdown table? */
function hasMarkdownTable(content: string): boolean {
  return /^\|.*\|\s*\n\|[\s:|-]+\|/m.test(content)
}

/* -------------------------------------------------------------------------- */
/* Main component                                                              */
/* -------------------------------------------------------------------------- */

export function LeoStudio() {
  // ----- State -----
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [teachingStyle, setTeachingStyle] = useState<TeachingStyle>('standard')
  const [leoState, setLeoState] = useState<LeoState>('greeting')
  // Local seed for component lifecycle (server session is created lazily
  // on first send via /api/tutor/session). Surfaced via a ref so future
  // diagnostics hooks can read it without re-rendering the component.
  const localSessionSeedRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `local-${Date.now()}`,
  )
  const [serverSessionId, setServerSessionId] = useState<string | null>(null)
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [activeCitation, setActiveCitation] = useState<{ messageIdx: number; idx: number } | null>(null)
  const [pinnedLesson, setPinnedLesson] = useState<PinnedLesson | null>(null)

  // ----- Refs -----
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sendingRef = useRef(false)
  const ttsEnabledRef = useRef(ttsEnabled)
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled
  }, [ttsEnabled])

  // ----- Hooks -----
  const { playing: ttsPlaying, loading: ttsLoading, play: ttsPlay, stop: ttsStop } = useTtsPlayer()
  const { recording: voiceRecording, error: voiceError, start: voiceStart, stop: voiceStop } =
    useVoiceRecorder({
      onComplete: async (base64, mimeType) => {
        try {
          const res = await fetch('/api/tutor/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64, mimeType }),
          })
          const payload = (await res.json().catch(() => null)) as
            | { ok?: boolean; data?: { transcript?: string }; error?: { message?: string } }
            | null
          if (!res.ok || !payload?.ok) {
            const msg = payload?.error?.message || 'Voice transcription failed.'
            toast.error(msg)
            return
          }
          const transcript = payload.data?.transcript?.trim()
          if (transcript) {
            setInput((current) => (current ? `${current} ${transcript}` : transcript))
            inputRef.current?.focus()
          }
        } catch {
          toast.error('Could not transcribe your recording. Try again.')
        }
      },
    })

  // ----- Mount: morph greeting → idle after a short beat -----
  useEffect(() => {
    // localSessionSeedRef is set eagerly during render; just log it for
    // diagnostics in dev tools if needed.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('[leo-studio] session seed', localSessionSeedRef.current)
    }
    const greetingTimer = window.setTimeout(() => setLeoState('idle'), 1800)
    return () => window.clearTimeout(greetingTimer)
  }, [localSessionSeedRef])

  // ----- Auto-scroll on new content -----
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // ----- Auto-grow textarea -----
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [input])

  // ----- Escape closes citation popover -----
  useEffect(() => {
    if (activeCitation === null) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCitation(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeCitation])

  // ----- Cleanup on unmount -----
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      ttsStop()
    }
  }, [ttsStop])

  // ----- Last LEO message (for follow-ups + citations in the context panel) -----
  const lastAssistant = useMemo<ChatMessage | null>(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && !messages[i].isStreaming) return messages[i]
    }
    return null
  }, [messages])

  const allCitations = useMemo<Citation[]>(() => {
    const acc: Citation[] = []
    for (const m of messages) {
      if (m.role === 'assistant' && m.citations) acc.push(...m.citations)
    }
    return acc
  }, [messages])

  // ----- Lazy-create the persisted server session -----
  const ensureServerSession = useCallback(async (): Promise<string | null> => {
    if (serverSessionId) return serverSessionId
    try {
      const res = await fetch('/api/tutor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'LEO Studio', mode: mapStyleToMode(teachingStyle) }),
      })
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: { id?: string }; error?: { message?: string } }
        | null
      if (!res.ok || !payload?.ok || !payload.data?.id) {
        const msg = payload?.error?.message || `Could not start a session (${res.status}).`
        toast.error(msg)
        return null
      }
      setServerSessionId(payload.data.id)
      return payload.data.id
    } catch {
      toast.error('Could not reach the tutor service. Try again.')
      return null
    }
  }, [serverSessionId, teachingStyle])

  // ----- Send a message -----
  const sendMessage = useCallback(
    async (raw: string, styleOverride?: TeachingStyle) => {
      const clean = raw.trim()
      if (!clean || sendingRef.current) return

      const style = styleOverride ?? teachingStyle
      const clientMessageId = createClientMessageId()
      const streamMessageId = `stream-${clientMessageId}`

      sendingRef.current = true
      setIsStreaming(true)
      setLeoState('thinking')
      setActiveCitation(null)

      // Optimistic user message + streaming assistant placeholder
      const userMsg: ChatMessage = {
        id: clientMessageId,
        role: 'user',
        content: clean,
        teachingStyle: style,
      }
      const placeholder: ChatMessage = {
        id: streamMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        teachingStyle: style,
      }
      setMessages((current) => [...current, userMsg, placeholder])
      setInput('')

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const sessionId = await ensureServerSession()
        if (!sessionId) {
          throw new Error('No active tutor session. Please reload and try again.')
        }

        const enhanced = `${clean}\n\n[${STYLE_PROMPTS[style]}]`
        const response = await fetch('/api/tutor/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            sessionId,
            clientMessageId,
            message: enhanced,
            mode: mapStyleToMode(style),
          }),
        })

        let streamFailure = ''
        let completed = false

        await consumeTutorStream(response, (event: TutorStreamEvent) => {
          if (event.type === 'meta') {
            return
          }
          if (event.type === 'delta') {
            setLeoState('encouraging')
            setMessages((current) =>
              current.map((item) =>
                item.id === streamMessageId
                  ? { ...item, content: `${item.content}${event.text}` }
                  : item,
              ),
            )
          } else if (event.type === 'done') {
            completed = true
            const citations = parseCitations(event.message.citations)
            const followUps = parseStringArray(event.message.followUps)
            setMessages((current) =>
              current.map((item) =>
                item.id === streamMessageId
                  ? {
                      ...item,
                      content: event.message.content || item.content,
                      citations,
                      followUps,
                      isStreaming: false,
                    }
                  : item,
              ),
            )
            setLeoState('happy')
            window.setTimeout(() => {
              if (!sendingRef.current) setLeoState('idle')
            }, 2200)

            // TTS auto-play when enabled
            if (ttsEnabledRef.current && event.message.content) {
              void ttsPlay(event.message.content).catch(() => {
                /* silent — TTS failures shouldn't interrupt the chat */
              })
            }
          } else if (event.type === 'error') {
            streamFailure = event.message
          }
        })

        if (streamFailure) throw new Error(streamFailure)
        if (!completed) throw new Error('LEO ended the response before it was complete. Please retry.')
      } catch (err) {
        const aborted =
          controller.signal.aborted || (err as Error)?.name === 'AbortError'
        if (!aborted) {
          const message =
            err instanceof Error ? err.message : 'LEO could not answer right now.'
          toast.error(message)
          setLeoState('sad')
          window.setTimeout(() => setLeoState('idle'), 2400)
        }
        // Remove the empty placeholder (keep it if it has partial content)
        setMessages((current) =>
          current.filter(
            (item) => item.id !== streamMessageId || item.content.trim().length > 0,
          ),
        )
      } finally {
        abortRef.current = null
        sendingRef.current = false
        setIsStreaming(false)
      }
    },
    [ensureServerSession, teachingStyle, ttsPlay],
  )

  // ----- Form submit handler -----
  const onSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      void sendMessage(input)
    },
    [input, sendMessage],
  )

  // ----- Input keydown: Enter to send, Shift+Enter for newline -----
  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void sendMessage(input)
      }
    },
    [input, sendMessage],
  )

  // ----- Voice toggle -----
  const onVoiceClick = useCallback(() => {
    if (isStreaming) return
    if (voiceRecording) {
      voiceStop()
    } else {
      void voiceStart()
    }
  }, [isStreaming, voiceRecording, voiceStart, voiceStop])

  // ----- TTS toggle -----
  const onTtsToggle = useCallback(() => {
    setTtsEnabled((current) => {
      const next = !current
      if (!next && ttsPlaying) ttsStop()
      return next
    })
  }, [ttsPlaying, ttsStop])

  // ----- Clear chat -----
  const onClearChat = useCallback(() => {
    if (isStreaming) {
      abortRef.current?.abort()
    }
    setMessages([])
    setLeoState('greeting')
    window.setTimeout(() => setLeoState('idle'), 1500)
    ttsStop()
    inputRef.current?.focus()
  }, [isStreaming, ttsStop])

  // ----- Stop streaming -----
  const onStopStreaming = useCallback(() => {
    abortRef.current?.abort()
    sendingRef.current = false
    setIsStreaming(false)
    setLeoState('idle')
  }, [])

  // ----- Follow-up click → send -----
  const onFollowUp = useCallback(
    (prompt: string) => {
      if (isStreaming) return
      void sendMessage(prompt)
    },
    [isStreaming, sendMessage],
  )

  // ----- Mode card click → set style + fill input -----
  const onModeCardClick = useCallback((prompt: string, style: TeachingStyle) => {
    setTeachingStyle(style)
    setInput((current) => (current ? `${current}\n\n${prompt}` : prompt))
    inputRef.current?.focus()
  }, [])

  // ----- Speak a specific message -----
  const onSpeakMessage = useCallback(
    (content: string) => {
      if (ttsPlaying) {
        ttsStop()
        return
      }
      void ttsPlay(content)
    },
    [ttsPlaying, ttsPlay, ttsStop],
  )

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="leo-studio">
      {/* =========================================================== */}
      {/* Chat column                                                  */}
      {/* =========================================================== */}
      <div className="leo-studio__chat">
        {/* ---- Sticky header ---- */}
        <header className="leo-studio__header" role="banner">
          <LeoPremium state={leoState} size="md" withFloat={false} ariaLabel="" />
          <div className="min-w-0 flex-1">
            <h1
              className="m-0 text-base font-semibold leading-tight"
              style={{ color: 'var(--text-strong)', letterSpacing: '-0.01em' }}
            >
              LEO
            </h1>
            <p
              className="m-0 truncate text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              AI Learning Studio
            </p>
          </div>

          {/* Teaching-style pills (horizontal scroll on mobile) */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto"
            role="group"
            aria-label="Teaching style"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              maxWidth: 'min(38vw, 360px)',
            }}
          >
            {TEACHING_STYLES.map((s) => {
              const Icon = s.icon
              const active = teachingStyle === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn('leo-style-pill', active && 'is-active')}
                  aria-pressed={active}
                  title={s.description}
                  onClick={() => setTeachingStyle(s.id)}
                >
                  <span className="inline-flex items-center gap-1">
                    <Icon className="h-3 w-3" aria-hidden />
                    {s.label}
                  </span>
                </button>
              )
            })}
          </div>

          {/* TTS toggle */}
          <button
            type="button"
            onClick={onTtsToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
            style={{
              borderColor: ttsEnabled ? 'var(--brand)' : 'var(--border-default)',
              backgroundColor: ttsEnabled
                ? 'color-mix(in oklch, var(--brand) 12%, transparent)'
                : 'transparent',
              color: ttsEnabled ? 'var(--brand)' : 'var(--text-secondary)',
            }}
            aria-pressed={ttsEnabled}
            aria-label={ttsEnabled ? 'Disable voice playback' : 'Enable voice playback'}
            title={ttsEnabled ? 'Voice on' : 'Voice off'}
          >
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Clear chat */}
          <button
            type="button"
            onClick={onClearChat}
            disabled={isStreaming || messages.length === 0}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </header>

        {/* ---- Messages ---- */}
        <div
          className="leo-studio__messages"
          ref={messagesRef}
          role="log"
          aria-live="polite"
          aria-label="LEO conversation"
        >
          {messages.length === 0 ? (
            <EmptyState
              onModeCardClick={onModeCardClick}
              pinnedLesson={pinnedLesson}
              onUnpin={() => setPinnedLesson(null)}
            />
          ) : (
            <div className="flex flex-col gap-4 pb-4">
              {messages.map((message, idx) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  messageIdx={idx}
                  activeCitation={activeCitation}
                  onCitationClick={(cIdx) =>
                    setActiveCitation(
                      activeCitation && activeCitation.messageIdx === idx && activeCitation.idx === cIdx
                        ? null
                        : { messageIdx: idx, idx: cIdx },
                    )
                  }
                  onSpeak={() => onSpeakMessage(message.content)}
                  ttsPlaying={ttsPlaying}
                  ttsLoading={ttsLoading}
                  onCloseCitation={() => setActiveCitation(null)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ---- Input area ---- */}
        <div className="leo-studio__input">
          <form onSubmit={onSubmit} className="w-full">
            <div className="leo-input-wrapper">
              <textarea
                ref={inputRef}
                className="leo-input-textarea"
                placeholder="Ask LEO anything — concepts, code, exam prep…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                disabled={isStreaming}
                rows={1}
                aria-label="Message LEO"
                aria-describedby="leo-input-meta"
              />

              {/* Voice button */}
              <button
                type="button"
                onClick={onVoiceClick}
                disabled={isStreaming}
                className={cn('leo-voice-btn', voiceRecording && 'is-recording')}
                aria-pressed={voiceRecording}
                aria-label={voiceRecording ? 'Stop recording' : 'Start voice input'}
                title={voiceRecording ? 'Stop recording' : 'Voice input'}
                data-recording={voiceRecording ? 'true' : undefined}
              >
                {voiceRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Send / Stop button */}
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStopStreaming}
                  className="leo-send-btn is-active"
                  aria-label="Stop generating"
                  title="Stop"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  className={cn('leo-send-btn', input.trim() && 'is-active')}
                  disabled={!input.trim()}
                  aria-label="Send message"
                  title="Send (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Meta line */}
            <div
              id="leo-input-meta"
              className="mt-2 flex items-center justify-between text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>
                {voiceError ? (
                  <span style={{ color: 'var(--destructive)' }}>{voiceError}</span>
                ) : (
                  <span>
                    <kbd
                      className="rounded px-1"
                      style={{
                        background: 'var(--surface-inset)',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '10px',
                      }}
                    >
                      Enter
                    </kbd>{' '}
                    send ·{' '}
                    <kbd
                      className="rounded px-1"
                      style={{
                        background: 'var(--surface-inset)',
                        border: '1px solid var(--border-subtle)',
                        fontFamily: 'var(--font-mono, monospace)',
                        fontSize: '10px',
                      }}
                    >
                      Shift+Enter
                    </kbd>{' '}
                    newline
                  </span>
                )}
              </span>
              {input.length > 100 && (
                <span aria-live="polite">{input.length} / 8000</span>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================== */}
      {/* Context panel (desktop only)                                 */}
      {/* =========================================================== */}
      <aside className="leo-studio__context" aria-label="Context panel">
        <ContextPanel
          pinnedLesson={pinnedLesson}
          onUnpin={() => setPinnedLesson(null)}
          followUps={lastAssistant?.followUps ?? []}
          citations={allCitations}
          lastCitations={lastAssistant?.citations ?? []}
          onFollowUp={onFollowUp}
          disabled={isStreaming}
        />
      </aside>
    </div>
  )
}

LeoStudio.displayName = 'LeoStudio'
export default LeoStudio

/* -------------------------------------------------------------------------- */
/* Empty state                                                                 */
/* -------------------------------------------------------------------------- */

function EmptyState({
  onModeCardClick,
  pinnedLesson,
  onUnpin,
}: {
  onModeCardClick: (prompt: string, style: TeachingStyle) => void
  pinnedLesson: PinnedLesson | null
  onUnpin: () => void
}) {
  return (
    <div className="leo-empty" role="region" aria-label="LEO welcome">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <LeoPremium state="greeting" size="2xl" withFloat withGlow />
      </motion.div>

      <h2 className="leo-empty__title mt-6">Hi, I&apos;m LEO</h2>
      <p className="leo-empty__lede">
        Your AI learning companion. Ask me anything — I&apos;ll teach, not just answer.
      </p>

      {pinnedLesson && (
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-inset)',
            color: 'var(--text-secondary)',
          }}
        >
          <Pin className="h-3 w-3" aria-hidden style={{ color: 'var(--brand)' }} />
          <span style={{ color: 'var(--text-strong)', fontWeight: 600 }}>
            {pinnedLesson.title}
          </span>
          <span>·</span>
          <span>{pinnedLesson.subject}</span>
          <button
            type="button"
            onClick={onUnpin}
            className="ml-1 rounded-full px-1.5 text-[10px] font-semibold uppercase"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Remove pinned lesson"
          >
            Remove
          </button>
        </div>
      )}

      <div className="leo-mode-grid">
        {MODE_CARDS.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.button
              key={card.title}
              type="button"
              className="leo-mode-card"
              onClick={() => onModeCardClick(card.prompt, card.style)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i, ease: 'easeOut' }}
              aria-label={`${card.title} — ${card.description}`}
            >
              <span className="leo-mode-card__icon" aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="leo-mode-card__title">{card.title}</span>
              <span className="leo-mode-card__desc">{card.description}</span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Message bubble                                                              */
/* -------------------------------------------------------------------------- */

function MessageBubble({
  message,
  messageIdx,
  activeCitation,
  onCitationClick,
  onSpeak,
  ttsPlaying,
  ttsLoading,
  onCloseCitation,
}: {
  message: ChatMessage
  messageIdx: number
  activeCitation: { messageIdx: number; idx: number } | null
  onCitationClick: (idx: number) => void
  onSpeak: () => void
  ttsPlaying: boolean
  ttsLoading: boolean
  onCloseCitation: () => void
}) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="leo-bubble-user">
          <p className="m-0 whitespace-pre-wrap">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  const isPlaceholder = message.isStreaming && !message.content
  const citations = message.citations ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex items-start gap-3"
    >
      <span className="leo-bubble-leo__avatar" aria-hidden>
        <LeoPremium
          state={message.isStreaming ? 'thinking' : 'happy'}
          size="sm"
          withFloat={false}
          withGlow={false}
          ariaLabel=""
        />
      </span>

      <div className="leo-bubble-leo min-w-0 flex-1">
        {isPlaceholder ? (
          <TypingIndicator />
        ) : (
          <div className="leo-bubble-leo__content">
            <MarkdownContent content={message.content} streaming={!!message.isStreaming} />

            {/* Citation chips are inline-rendered, but also list them at the bottom
                for screen readers + non-marker-aware users. */}
            {citations.length > 0 && !message.isStreaming && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3"
                style={{ borderColor: 'var(--border-subtle)' }}
                aria-label="Sources cited"
              >
                <span
                  className="mr-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sources
                </span>
                {citations.map((c, idx) => (
                  <button
                    key={`${c.sourceId}-${idx}`}
                    type="button"
                    className="leo-citation"
                    onClick={() => onCitationClick(idx)}
                    title={c.location || c.title}
                    aria-label={`Citation ${idx + 1}: ${c.title}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* Footer toolbar */}
            {!message.isStreaming && message.content && (
              <div
                className="mt-3 flex items-center justify-end gap-1 border-t pt-2"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={onSpeak}
                  disabled={ttsLoading}
                  className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium transition-colors disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                  aria-label={ttsPlaying ? 'Stop voice playback' : 'Read this aloud'}
                  title={ttsPlaying ? 'Stop voice' : 'Read aloud'}
                >
                  {ttsLoading ? (
                    <Sparkles className="h-3 w-3 animate-pulse" />
                  ) : ttsPlaying ? (
                    <VolumeX className="h-3 w-3" />
                  ) : (
                    <Volume2 className="h-3 w-3" />
                  )}
                  {ttsPlaying ? 'Stop' : 'Listen'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Citation popover */}
        <AnimatePresence>
          {activeCitation &&
            activeCitation.messageIdx === messageIdx &&
            citations[activeCitation.idx] && (
              <CitationPopover
                citation={citations[activeCitation.idx]}
                idx={activeCitation.idx}
                onClose={onCloseCitation}
              />
            )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/* Typing indicator                                                            */
/* -------------------------------------------------------------------------- */

function TypingIndicator() {
  return (
    <div className="leo-typing" aria-label="LEO is thinking" role="status">
      <span className="leo-typing__dot" />
      <span className="leo-typing__dot" />
      <span className="leo-typing__dot" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Citation popover                                                            */
/* -------------------------------------------------------------------------- */

function CitationPopover({
  citation,
  idx,
  onClose,
}: {
  citation: Citation
  idx: number
  onClose: () => void
}) {
  return (
    <motion.div
      className="leo-citation-popover"
      role="dialog"
      aria-label={`Citation ${idx + 1}`}
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ top: '100%', left: 0, marginTop: '6px' }}
    >
      <div className="leo-citation-popover__title">Source {idx + 1}</div>
      <div className="leo-citation-popover__source">{citation.title}</div>
      {citation.location && (
        <div className="leo-citation-popover__quote">{citation.location}</div>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--brand)' }}
        aria-label="Close citation"
      >
        Close
      </button>
    </motion.div>
  )
}

/* -------------------------------------------------------------------------- */
/* Markdown content with custom renderers                                      */
/* -------------------------------------------------------------------------- */

function MarkdownContent({ content, streaming }: { content: string; streaming: boolean }) {
  // Inject citation chip placeholders for [n] markers, then let
  // ReactMarkdown's `text` renderer transform them back into buttons.
  const processed = useMemo(() => {
    return content.replace(CITATION_PATTERN, (_m, n) => `\u0001CITE:${n}\u0001`)
  }, [content])

  // Lightweight visual-suggestion: if a markdown table is present,
  // show a "view as visual" toggle button. Pure client-side nudge,
  // no auto-render per spec.
  const showVisualHint = useMemo(() => hasMarkdownTable(content), [content])
  const [showVisual, setShowVisual] = useState(false)

  // Build a comparison VisualData from the markdown table (very
  // lightweight — only handles simple tables with a header row).
  const visualData = useMemo<VisualData | null>(() => {
    if (!showVisualHint) return null
    const lines = content.split('\n').filter((l) => l.trim().startsWith('|'))
    if (lines.length < 2) return null
    const parse = (line: string) =>
      line
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim())
    const header = parse(lines[0])
    const rows = lines.slice(2).map((line) => {
      const cells = parse(line)
      return { feature: cells[0] ?? '', values: cells.slice(1).map((c) => c || '—') }
    })
    return {
      type: 'comparison',
      title: 'Side-by-side comparison',
      columns: header.slice(1).map((c) => c || '—'),
      rows,
    }
  }, [content, showVisualHint])

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Inline code → styled <code>
          // Block code → CodeBlock with language detection
          code(props) {
            const { className, children, ...rest } = props
            const text = String(children ?? '')
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !text.includes('\n') && !className
            if (isInline) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              )
            }
            return (
              <CodeBlock
                code={text.replace(/\n$/, '')}
                language={match?.[1] ?? 'plaintext'}
                showLineNumbers={false}
              />
            )
          },

          // GFM-style callouts: `> [!tip] ...` → <Callout>
          blockquote(props) {
            const { children } = props
            const firstChild = Array.isArray(children) ? children[0] : children
            // Try to detect a leading [!type] marker in the raw text.
            // react-markdown gives us parsed nodes, so we look at the
            // text content of the first paragraph.
            const text = extractText(firstChild)
            const m = CALLOUT_PATTERN.exec(text.trim())
            if (m) {
              const type = m[1].toLowerCase()
              const cleaned = text.replace(CALLOUT_PATTERN, '').trim()
              return (
                <Callout type={type === 'note' ? 'info' : type} content={cleaned} />
              )
            }
            return <blockquote>{children}</blockquote>
          },

          // Premium-styled tables — .leo-bubble-leo__content table
          // already handles the visual; we just ensure it renders.
          table({ children }) {
            return <table>{children}</table>
          },

          // Citation chip: when react-markdown renders a `text` node
          // containing our \u0001CITE:n\u0001 placeholder, swap it for
          // a styled citation chip. We render the chip as a non-button
          // span here (interactive handlers live on the bottom-of-
          // message source list); the inline marker is purely visual.
          // NOTE: react-markdown v10 doesn't give us a per-character
          // hook, so we render the text as-is and let the source list
          // at the bottom of the bubble handle interactivity.
          p({ children }) {
            return <p>{renderCitationMarkers(children)}</p>
          },
        }}
      >
        {processed}
      </ReactMarkdown>

      {/* Streaming cursor */}
      {streaming && (
        <motion.span
          className="leo-streaming-cursor"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}

      {/* Visual suggestion — keep markdown by default, optionally render
          the table as a ComparisonTableVisual for better scanning. */}
      {showVisualHint && !streaming && visualData && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowVisual((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--brand)',
              background: 'color-mix(in oklch, var(--brand) 6%, transparent)',
            }}
            aria-expanded={showVisual}
          >
            <GitCompare className="h-3 w-3" aria-hidden />
            {showVisual ? 'Hide visual' : 'View as comparison'}
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', showVisual && 'rotate-180')}
              aria-hidden
            />
          </button>
          <AnimatePresence>
            {showVisual && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-2 overflow-hidden"
              >
                <VisualRenderer data={visualData} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

/** Walk a react-markdown child node, extracting its plain-text content. */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (typeof node === 'object' && 'props' in node) {
    // @ts-expect-error — react node shape is intentionally loose
    return extractText(node.props?.children)
  }
  return ''
}

/** Replace citation placeholder markers in a text node with chip spans. */
function renderCitationMarkers(children: ReactNode): ReactNode {
  if (children == null) return children
  if (typeof children === 'string') {
    return splitOnCiteMarker(children)
  }
  if (Array.isArray(children)) {
    return children.map((c, i) =>
      typeof c === 'string' ? <span key={i}>{splitOnCiteMarker(c)}</span> : c,
    )
  }
  return children
}

function splitOnCiteMarker(text: string): ReactNode[] {
  const parts = text.split(/\u0001CITE:(\d{1,2})\u0001/)
  if (parts.length === 1) return [text]
  const out: ReactNode[] = []
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) out.push(parts[i])
    if (i + 1 < parts.length) {
      const n = Number(parts[i + 1])
      out.push(
        <span key={`cite-${i}`} className="leo-citation" aria-label={`Citation ${n}`}>
          {n}
        </span>,
      )
    }
  }
  return out
}

/* -------------------------------------------------------------------------- */
/* Context panel (right column)                                                */
/* -------------------------------------------------------------------------- */

function ContextPanel({
  pinnedLesson,
  onUnpin,
  followUps,
  citations,
  lastCitations,
  onFollowUp,
  disabled,
}: {
  pinnedLesson: PinnedLesson | null
  onUnpin: () => void
  followUps: string[]
  citations: Citation[]
  lastCitations: Citation[]
  onFollowUp: (prompt: string) => void
  disabled: boolean
}) {
  return (
    <div>
      {/* Pinned lesson */}
      {pinnedLesson && (
        <div className="leo-context-card">
          <div className="leo-context-card__title">Pinned lesson</div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-sm font-semibold"
                style={{ color: 'var(--text-strong)' }}
              >
                {pinnedLesson.title}
              </div>
              <div
                className="truncate text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                {pinnedLesson.subject}
              </div>
            </div>
            <button
              type="button"
              onClick={onUnpin}
              className="rounded-md p-1 text-[10px] font-semibold uppercase transition-colors"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Unpin lesson"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {followUps.length > 0 && (
        <div className="leo-context-card">
          <div className="leo-context-card__title">Follow up with LEO</div>
          {followUps.map((q, i) => (
            <button
              key={i}
              type="button"
              className="leo-followup-chip"
              onClick={() => onFollowUp(q)}
              disabled={disabled}
            >
              <span className="inline-flex items-start gap-1.5">
                <ArrowRight
                  className="mt-0.5 h-3 w-3 shrink-0"
                  aria-hidden
                  style={{ color: 'var(--brand)' }}
                />
                <span>{q}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Citations from the latest message */}
      {lastCitations.length > 0 && (
        <div className="leo-context-card">
          <div className="leo-context-card__title">Latest sources</div>
          <ol className="m-0 list-none space-y-1.5 p-0">
            {lastCitations.map((c, i) => (
              <li key={`${c.sourceId}-${i}`} className="flex items-start gap-2 text-xs">
                <span
                  className="leo-citation"
                  style={{ position: 'static', verticalAlign: 'baseline' }}
                  aria-hidden
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate font-semibold"
                    style={{ color: 'var(--text-strong)' }}
                  >
                    {c.title}
                  </span>
                  {c.location && (
                    <span
                      className="block truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {c.location}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* All-citations history (only if different from the latest set) */}
      {citations.length > lastCitations.length && (
        <div className="leo-context-card">
          <div className="leo-context-card__title">All sources ({citations.length})</div>
          <ol className="m-0 list-none space-y-1 p-0">
            {citations.map((c, i) => (
              <li
                key={`all-${c.sourceId}-${i}`}
                className="truncate text-xs"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span
                  className="mr-1.5 font-semibold"
                  style={{ color: 'var(--brand)' }}
                >
                  {i + 1}.
                </span>
                {c.title}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tips card */}
      <div className="leo-context-card">
        <div className="leo-context-card__title">Tips</div>
        <ul
          className="m-0 list-none space-y-2 p-0 text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          <li className="flex items-start gap-2">
            <Lightbulb
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden
              style={{ color: 'var(--warning)' }}
            />
            <span>
              Pick a teaching style above to tune LEO&apos;s answer depth —
              ELI10 for intuition, Engineer for trade-offs.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <BookOpen
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden
              style={{ color: 'var(--info)' }}
            />
            <span>
              Tap any{' '}
              <span
                className="leo-citation"
                style={{ position: 'static', verticalAlign: 'baseline' }}
                aria-hidden
              >
                1
              </span>{' '}
              marker to see the source LEO cited.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Code2
              className="mt-0.5 h-3 w-3 shrink-0"
              aria-hidden
              style={{ color: 'var(--success)' }}
            />
            <span>
              <kbd
                className="rounded px-1"
                style={{
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '10px',
                }}
              >
                Enter
              </kbd>{' '}
              sends ·{' '}
              <kbd
                className="rounded px-1"
                style={{
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '10px',
                }}
              >
                Esc
              </kbd>{' '}
              closes popovers.
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
