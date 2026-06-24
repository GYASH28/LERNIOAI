'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, GraduationCap, Languages, FileText, StickyNote, ListChecks,
  HelpCircle, Mic, Key, CheckCircle, Bug, GitCompare, Layers, CalendarCheck,
  TrendingDown, Plus, MoreVertical, Pencil, Archive, Trash2, Send, Copy,
  ThumbsUp, ThumbsDown, RefreshCw, MessageSquare, Sparkles, BookOpen,
  AlertTriangle, Loader2, PanelLeft, CheckCircle2, Volume2, VolumeX, Square,
  AudioLines, Settings2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TUTOR_MODES,
  type TutorMode,
  type TutorSession,
  type TutorMessage,
} from '@/lib/types'
import { useVoiceRecorder } from '@/hooks/use-voice-recorder'
import { useTtsPlayer, TTS_VOICES, setTtsPrefs } from '@/hooks/use-tts-player'

// localStorage keys for the AI Tutor voice prefs
const AUTO_READ_KEY = 'lernio.tutor.autoRead'

// ---------------------------------------------------------------------------
// Icon map for the 17 tutor modes (icon field is a string in TUTOR_MODES)
// ---------------------------------------------------------------------------
type IconType = React.ComponentType<{ className?: string }>
const MODE_ICONS: Record<string, IconType> = {
  Lightbulb, GraduationCap, Languages, FileText, StickyNote, ListChecks,
  HelpCircle, Mic, Key, CheckCircle, Bug, GitCompare, Layers, CalendarCheck,
  TrendingDown,
}

const MODE_LABEL: Record<string, string> = Object.fromEntries(
  TUTOR_MODES.map((m) => [m.key, m.label])
)

// Quick prompt suggestions per mode (mode-dependent chips below input)
const MODE_QUICK_PROMPTS: Partial<Record<TutorMode, string[]>> = {
  explain_simple: [
    'Explain this topic in simple English',
    'Why is this concept important?',
    'Give me a real-world example',
  ],
  explain_deep: [
    'Break down this concept in depth',
    'What are the edge cases?',
    'Explain the underlying theory',
  ],
  hinglish: [
    'Isko Hinglish mein samjhao',
    'Ek example do',
    'Short mein batao',
  ],
  marathi: [
    'या विषयाचे स्पष्टीकरण द्या',
    'एक उदाहरण द्या',
    'Short notes द्या',
  ],
  exam_answer: [
    'Write a 5-mark exam answer',
    'What would a 10-mark answer look like?',
    'Give me a scoring-format answer',
  ],
  short_notes: [
    'Make short notes for revision',
    'List the key points only',
    'Give me a 1-minute recap',
  ],
  create_mcqs: [
    'Generate 5 MCQs on this topic',
    'Give me 3 hard MCQs',
    'Create a quick quiz',
  ],
  ask_me: [
    'Quiz me on this topic',
    'Ask me a question',
    'Test my understanding',
  ],
  conduct_viva: [
    'Start a viva on this topic',
    'Ask me viva questions',
    'Conduct a 5-minute viva',
  ],
  hint_only: [
    'Give me a hint, not the answer',
    'Point me in the right direction',
    'Guide me without revealing the answer',
  ],
  check_answer: [
    'I will type my answer — evaluate it',
    'Check my explanation',
    'Score my answer out of 10',
  ],
  debug_code: [
    'Paste my code — find the bugs',
    'What is wrong with my logic?',
    'Suggest improvements',
  ],
  compare_concepts: [
    'Compare this with the alternative',
    'A vs B — which to use?',
    'Tabulate the differences',
  ],
  generate_flashcards: [
    'Make 6 flashcards on this topic',
    'Create exam-ready flashcards',
    'Generate quick recall cards',
  ],
  build_study_plan: [
    'Build a 7-day study plan',
    'Plan my revision for this topic',
    'Schedule my next 3 days',
  ],
  review_weak_topics: [
    'Where do students usually go wrong?',
    'List common mistakes on this topic',
    'Target my weak spots',
  ],
  summarise_material: [
    'Summarise this material for me',
    'Key takeaways only',
    'Condense this for revision',
  ],
}

const DEFAULT_QUICK_PROMPTS = [
  'Explain this concept',
  'Give me an example',
  'What are common exam questions?',
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

interface Citation {
  sourceId?: string
  title?: string
  location?: string
  url?: string
}

function groundingBadge(status?: string | null) {
  switch (status) {
    case 'grounded':
      return {
        label: 'Grounded',
        className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-500',
      }
    case 'partially_grounded':
      return {
        label: 'Partially Grounded',
        className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        dot: 'bg-amber-500',
      }
    default:
      return {
        label: 'General Knowledge',
        className: 'bg-muted text-muted-foreground border-border',
        dot: 'bg-muted-foreground',
      }
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function TutorView() {
  const { subjects } = useAppStore()

  const [sessions, setSessions] = useState<TutorSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [creating, setCreating] = useState(false)

  // Chat-local state (driven by the active session)
  const [messages, setMessages] = useState<TutorMessage[]>([])
  const [mode, setMode] = useState<TutorMode>('explain_simple')
  const [sending, setSending] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  // Context selectors
  const [subjectId, setSubjectId] = useState<string>('')
  const [unitNumber, setUnitNumber] = useState<string>('') // store as string for Select
  const [topicId, setTopicId] = useState<string>('')

  // Mobile sessions sheet
  const [sessionsOpen, setSessionsOpen] = useState(false)

  // Rename dialog
  const [renameTarget, setRenameTarget] = useState<TutorSession | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // --- Load sessions on mount --------------------------------------------
  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch('/api/tutor/session')
      const json = await res.json()
      if (json.ok) {
        setSessions(json.data as TutorSession[])
        // Auto-select the most recent session if we have none active
        if (json.data.length > 0 && !activeSessionId) {
          const first = json.data[0]
          setActiveSessionId(first.id)
        }
      } else {
        toast.error('Failed to load sessions', { description: json.error?.message })
      }
    } catch (e) {
      toast.error('Failed to load sessions', { description: String(e) })
    } finally {
      setLoadingSessions(false)
    }
  }, [activeSessionId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // --- Keep messages + mode in sync with the active session --------------
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([])
      return
    }
    const active = sessions.find((s) => s.id === activeSessionId)
    if (active) {
      setMessages(active.messages || [])
      setMode((active.mode as TutorMode) || 'explain_simple')
      // Pre-fill context selectors from the session if available
      if (active.subjectId) setSubjectId(active.subjectId)
      if (active.unitNumber) setUnitNumber(String(active.unitNumber))
      if (active.topicId) setTopicId(active.topicId)
    }
  }, [activeSessionId, sessions])

  // --- Auto-scroll on new messages ---------------------------------------
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [messages, sending])

  // --- Derived context for chat API --------------------------------------
  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === subjectId) || null,
    [subjects, subjectId]
  )
  const activeUnit = useMemo(() => {
    if (!activeSubject || !unitNumber) return null
    return activeSubject.units.find((u) => String(u.number) === unitNumber) || null
  }, [activeSubject, unitNumber])
  const activeTopic = useMemo(() => {
    if (!activeUnit || !topicId) return null
    return activeUnit.topics.find((t) => t.id === topicId) || null
  }, [activeUnit, topicId])

  // --- Actions -----------------------------------------------------------
  const handleCreateSession = useCallback(async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/tutor/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New session',
          subjectId: subjectId || undefined,
          mode: 'explain_simple',
          language: 'en',
        }),
      })
      const json = await res.json()
      if (json.ok) {
        const created = json.data as TutorSession
        setSessions((prev) => [created, ...prev])
        setActiveSessionId(created.id)
        setSessionsOpen(false)
        toast.success('New session started', { description: 'LEO is ready to chat.' })
      } else {
        toast.error('Failed to create session', { description: json.error?.message })
      }
    } catch (e) {
      toast.error('Failed to create session', { description: String(e) })
    } finally {
      setCreating(false)
    }
  }, [subjectId])

  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id)
    setSessionsOpen(false)
    setLastError(null)
  }, [])

  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/tutor/session?sessionId=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (activeSessionId === id) {
          setActiveSessionId(null)
          setMessages([])
        }
        toast.success('Session deleted')
      } else {
        toast.error('Failed to delete session', { description: json.error?.message })
      }
    } catch (e) {
      toast.error('Failed to delete session', { description: String(e) })
    }
  }, [activeSessionId])

  const handleArchiveSession = useCallback(async (id: string) => {
    try {
      const res = await fetch('/api/tutor/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, archived: true }),
      })
      const json = await res.json()
      if (json.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id))
        if (activeSessionId === id) {
          setActiveSessionId(null)
          setMessages([])
        }
        toast.success('Session archived')
      } else {
        toast.error('Failed to archive', { description: json.error?.message })
      }
    } catch (e) {
      toast.error('Failed to archive', { description: String(e) })
    }
  }, [activeSessionId])

  const handleRenameSession = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch('/api/tutor/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, title }),
      })
      const json = await res.json()
      if (json.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title } : s))
        )
        toast.success('Session renamed')
      } else {
        toast.error('Failed to rename', { description: json.error?.message })
      }
    } catch (e) {
      toast.error('Failed to rename', { description: String(e) })
    }
  }, [])

  const handleModeChange = useCallback(async (newMode: TutorMode) => {
    setMode(newMode)
    if (!activeSessionId) return
    // Persist mode change
    try {
      const res = await fetch('/api/tutor/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSessionId, mode: newMode }),
      })
      const json = await res.json()
      if (json.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === activeSessionId ? { ...s, mode: newMode } : s))
        )
      }
    } catch {
      // Non-blocking — local state already updated
    }
  }, [activeSessionId])

  // Auto-read replies state (persisted to localStorage)
  const [autoRead, setAutoRead] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setAutoRead(localStorage.getItem(AUTO_READ_KEY) === 'true')
  }, [])
  const toggleAutoRead = useCallback((v: boolean) => {
    setAutoRead(v)
    if (typeof window !== 'undefined') localStorage.setItem(AUTO_READ_KEY, String(v))
  }, [])

  // Shared TTS player — one instance drives both manual Speak buttons and auto-read.
  const tts = useTtsPlayer()

  // Auto-read: when a new assistant message arrives and auto-read is on, speak it.
  // Track the last-spoken message id so we don't re-speak on re-renders.
  const lastSpokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoRead) return
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!lastAssistant || lastAssistant.id === lastSpokenRef.current) return
    // Skip if it's the session-opening greeting (id starts with 'greeting')
    if (lastAssistant.id.startsWith('greeting')) return
    lastSpokenRef.current = lastAssistant.id
    tts.play(lastAssistant.content)
  }, [messages, autoRead, tts])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return
      if (!activeSessionId) {
        toast.error('No active session', { description: 'Create a session first.' })
        return
      }

      setLastError(null)

      // Optimistic user message
      const optimisticUser: TutorMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: trimmed,
        mode,
      }
      setMessages((prev) => [...prev, optimisticUser])
      setSending(true)

      try {
        const res = await fetch('/api/tutor/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: activeSessionId,
            message: trimmed,
            mode,
            subjectName: activeSubject?.name,
            unitTitle: activeUnit?.title,
            topicTitle: activeTopic?.title,
          }),
        })
        const json = await res.json()
        if (json.ok) {
          const assistantMsg = json.data.message as TutorMessage
          setMessages((prev) => [...prev, assistantMsg])
          // Refresh session list to reflect updatedAt + new message counts
          // (light touch — just bump updatedAt for the active session locally)
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    updatedAt: new Date().toISOString(),
                    messages: [...(s.messages || []), optimisticUser, assistantMsg],
                  }
                : s
            )
          )
          if (json.data.fallback) {
            toast.warning('LEO used a fallback response', {
              description: 'Try again for a fully grounded answer.',
            })
          }
        } else {
          // Roll back optimistic message
          setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
          setLastError(json.error?.message || 'Failed to get response')
          toast.error('LEO could not respond', {
            description: json.error?.message,
          })
        }
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
        setLastError(String(e))
        toast.error('Network error', { description: String(e) })
      } finally {
        setSending(false)
      }
    },
    [sending, activeSessionId, mode, activeSubject, activeUnit, activeTopic]
  )

  // Voice input: record mic, POST to /api/tutor/voice, then send the transcribed text.
  const handleVoiceComplete = useCallback(
    async (base64: string, _mimeType: string) => {
      try {
        const res = await fetch('/api/tutor/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 }),
        })
        const json = await res.json()
        if (json.ok && json.data?.text) {
          toast.success('Voice transcribed', { description: json.data.text.slice(0, 80) + (json.data.text.length > 80 ? '…' : '') })
          sendMessage(json.data.text)
        } else {
          toast.error('Voice transcription failed', { description: json.error?.message })
        }
      } catch (e) {
        toast.error('Voice input error', { description: String(e) })
      }
    },
    [sendMessage],
  )

  const handleRegenerate = useCallback(
    (message: TutorMessage) => {
      // Find the user message immediately preceding this assistant message
      const idx = messages.findIndex((m) => m.id === message.id)
      if (idx <= 0) return
      const prevUser = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user')
      if (!prevUser) return
      // Remove the assistant message and re-send the user message
      setMessages((prev) => prev.filter((m) => m.id !== message.id))
      sendMessage(prevUser.content)
    },
    [messages, sendMessage]
  )

  const handleFeedback = useCallback(
    (message: TutorMessage, type: 'up' | 'down') => {
      // Persist feedback locally for now (no backend endpoint)
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, feedback: type } : m
        )
      )
      toast.success(type === 'up' ? 'Thanks for the feedback!' : 'Thanks — LEO will improve.')
    },
    []
  )

  const openRename = (s: TutorSession) => {
    setRenameTarget(s)
    setRenameValue(s.title)
  }

  // --- Render ------------------------------------------------------------
  const sidebarContent = (
    <SessionsSidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      loading={loadingSessions}
      creating={creating}
      onSelect={handleSelectSession}
      onCreate={handleCreateSession}
      onRename={openRename}
      onArchive={handleArchiveSession}
      onDelete={handleDeleteSession}
    />
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Mobile: sessions trigger */}
      <div className="lg:hidden flex items-center justify-between">
        <Sheet open={sessionsOpen} onOpenChange={setSessionsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <PanelLeft className="h-4 w-4" />
              Sessions
              {sessions.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-meta">
                  {sessions.length}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Tutor Sessions
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 min-h-0 mt-2">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mascot mascot="leo" state="greeting" size={24} animated={false} />
          <span className="hidden sm:inline">LEO is online</span>
        </div>
      </div>

      {/* Two-column desktop layout */}
      <div className="grid lg:grid-cols-[300px_1fr] gap-4">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col min-h-0">
          {sidebarContent}
        </aside>

        {/* Chat column */}
        <section className="flex flex-col min-h-[600px] lg:h-[calc(100vh-9rem)] lg:min-h-0">
          {!activeSessionId ? (
            <EmptyActiveState onCreate={handleCreateSession} creating={creating} />
          ) : (
            <>
              {/* Mode selector (horizontal scroll) */}
              <ModeSelector value={mode} onChange={handleModeChange} />

              {/* Context bar */}
              <ContextBar
                subjects={subjects}
                subjectId={subjectId}
                unitNumber={unitNumber}
                topicId={topicId}
                onSubjectChange={(v) => {
                  setSubjectId(v)
                  setUnitNumber('')
                  setTopicId('')
                }}
                onUnitChange={(v) => {
                  setUnitNumber(v)
                  setTopicId('')
                }}
                onTopicChange={setTopicId}
              />

              {/* Messages area */}
              <div
                ref={scrollContainerRef}
                className="flex-1 min-h-[400px] overflow-y-auto pr-1 -mr-1 mt-3 scroll-smooth"
              >
                {messages.length === 0 ? (
                  <EmptyChatState
                    mode={mode}
                    onPrompt={(p) => sendMessage(p)}
                  />
                ) : (
                  <div className="space-y-4 pb-2">
                    <AnimatePresence initial={false}>
                      {messages.map((m) =>
                        m.role === 'user' ? (
                          <UserMessage key={m.id} message={m} />
                        ) : (
                          <AssistantMessage
                            key={m.id}
                            message={m}
                            onRegenerate={() => handleRegenerate(m)}
                            onFeedback={(t) => handleFeedback(m, t)}
                            onFollowUp={(p) => sendMessage(p)}
                            onSpeak={(text) => tts.play(text)}
                            onStopSpeak={tts.stop}
                            isSpeaking={tts.playing}
                            isSpeakLoading={tts.loading}
                          />
                        )
                      )}
                    </AnimatePresence>

                    {sending && <ThinkingIndicator />}
                    {lastError && (
                      <ErrorRetry
                        message={lastError}
                        onRetry={() => {
                          const lastUser = [...messages]
                            .reverse()
                            .find((m) => m.role === 'user')
                          if (lastUser) sendMessage(lastUser.content)
                        }}
                      />
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" />
              </div>

              {/* Input */}
              <ChatInput
                mode={mode}
                disabled={sending}
                onSend={sendMessage}
                onVoiceComplete={handleVoiceComplete}
                autoRead={autoRead}
                onToggleAutoRead={toggleAutoRead}
                ttsPlaying={tts.playing}
                ttsLoading={tts.loading}
                onStopTts={tts.stop}
              />
            </>
          )}
        </section>
      </div>

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename session</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Session title"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameTarget && renameValue.trim()) {
                handleRenameSession(renameTarget.id, renameValue.trim())
                setRenameTarget(null)
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim()}
              onClick={() => {
                if (renameTarget && renameValue.trim()) {
                  handleRenameSession(renameTarget.id, renameValue.trim())
                  setRenameTarget(null)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessions sidebar
// ---------------------------------------------------------------------------
function SessionsSidebar({
  sessions,
  activeSessionId,
  loading,
  creating,
  onSelect,
  onCreate,
  onRename,
  onArchive,
  onDelete,
}: {
  sessions: TutorSession[]
  activeSessionId: string | null
  loading: boolean
  creating: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (s: TutorSession) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <Card className="flex flex-col h-full lg:max-h-[calc(100vh-9rem)] min-h-0">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Sessions
          </CardTitle>
          <Button
            size="sm"
            className="gap-1 h-7"
            onClick={onCreate}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-2 pt-0">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6 py-10 gap-3">
            <Mascot mascot="leo" state="greeting" size={56} />
            <p className="text-sm font-medium">No sessions yet</p>
            <p className="text-xs text-muted-foreground">
              Start a new session to chat with me!
            </p>
            <Button size="sm" onClick={onCreate} disabled={creating} className="gap-1 mt-1">
              <Plus className="h-3.5 w-3.5" />
              New Session
            </Button>
          </div>
        ) : (
          <div className="h-full overflow-y-auto -mr-1 pr-1 space-y-1">
            {sessions.map((s) => (
              <SessionItem
                key={s.id}
                session={s}
                active={s.id === activeSessionId}
                onSelect={() => onSelect(s.id)}
                onRename={() => onRename(s)}
                onArchive={() => onArchive(s.id)}
                onDelete={() => onDelete(s.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SessionItem({
  session,
  active,
  onSelect,
  onRename,
  onArchive,
  onDelete,
}: {
  session: TutorSession
  active: boolean
  onSelect: () => void
  onRename: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const modeMeta = TUTOR_MODES.find((m) => m.key === session.mode)
  const Icon = (modeMeta ? MODE_ICONS[modeMeta.icon] : null) || Sparkles
  return (
    <div
      className={cn(
        'group relative flex items-start gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors',
        active
          ? 'border-primary/40 bg-primary/10'
          : 'border-transparent hover:bg-accent/60'
      )}
      onClick={onSelect}
    >
      <div
        className={cn(
          'mt-0.5 h-7 w-7 shrink-0 rounded-md flex items-center justify-center',
          active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium truncate',
            active && 'text-primary'
          )}
        >
          {session.title}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="outline" className="text-meta px-1.5 py-0 h-4 font-normal">
            {MODE_LABEL[session.mode] || session.mode}
          </Badge>
          <span className="text-meta text-muted-foreground">
            {timeAgo(session.updatedAt)}
          </span>
        </div>
      </div>
      <div
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded-md hover:bg-background text-muted-foreground hover:text-foreground"
              aria-label="Session options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onRename} className="gap-2 text-xs">
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onArchive} className="gap-2 text-xs">
              <Archive className="h-3.5 w-3.5" /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-xs text-destructive focus:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty states
// ---------------------------------------------------------------------------
function EmptyActiveState({
  onCreate,
  creating,
}: {
  onCreate: () => void
  creating: boolean
}) {
  return (
    <Card className="flex-1 flex items-center justify-center min-h-[500px] border-dashed">
      <CardContent className="flex flex-col items-center text-center p-8 gap-4">
        <Mascot mascot="leo" state="greeting" size={96} />
        <div>
          <h3 className="text-lg font-semibold">Chat with LEO</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Hi! I&apos;m LEO. Ask me anything about your subjects — explain a
            concept, generate MCQs, prepare for viva, and much more.
          </p>
        </div>
        <Button onClick={onCreate} disabled={creating} className="gap-2">
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Start a new session
        </Button>
      </CardContent>
    </Card>
  )
}

function EmptyChatState({
  mode,
  onPrompt,
}: {
  mode: TutorMode
  onPrompt: (p: string) => void
}) {
  const prompts = MODE_QUICK_PROMPTS[mode] || DEFAULT_QUICK_PROMPTS
  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-10 gap-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <Mascot mascot="leo" state="greeting" size={80} />
        <div className="max-w-md">
          <p className="text-base font-semibold">Hi! I&apos;m LEO.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ask me anything about your subjects. Pick a mode above to change how
            I respond.
          </p>
        </div>
      </motion.div>
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mode selector — 4 primary chips + "More modes" dropdown for the remaining 13
// ---------------------------------------------------------------------------
const PRIMARY_MODES: TutorMode[] = [
  'explain_simple', 'exam_answer', 'hinglish', 'short_notes',
]

function ModeSelector({
  value,
  onChange,
}: {
  value: TutorMode
  onChange: (m: TutorMode) => void
}) {
  const primarySet = new Set(PRIMARY_MODES)
  const primary = TUTOR_MODES.filter((m) => primarySet.has(m.key))
  const secondary = TUTOR_MODES.filter((m) => !primarySet.has(m.key))
  const activeInSecondary = secondary.find((m) => m.key === value)
  const ActiveSecondaryIcon = activeInSecondary
    ? MODE_ICONS[activeInSecondary.icon] || Sparkles
    : null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Primary chips */}
      <div className="flex gap-1.5 flex-wrap">
        {primary.map((m) => {
          const Icon = MODE_ICONS[m.icon] || Sparkles
          const active = value === m.key
          return (
            <Tooltip key={m.key}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onChange(m.key)}
                  className={cn(
                    'mode-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus-ring',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30'
                  )}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px]">
                <p className="font-medium">{m.label}</p>
                <p className="text-muted-foreground text-meta mt-0.5">{m.desc}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      {/* "More modes" dropdown for the remaining 13 */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'mode-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap focus-ring',
                  activeInSecondary
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-dashed border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30'
                )}
                aria-haspopup="menu"
              >
                {ActiveSecondaryIcon ? (
                  <>
                    <ActiveSecondaryIcon className="h-3.5 w-3.5" />
                    {activeInSecondary!.label}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    More modes
                  </>
                )}
                <svg className="h-3 w-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="font-medium">More tutor modes</p>
            <p className="text-muted-foreground text-meta mt-0.5">13 additional ways to learn</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-64 max-h-[360px] overflow-y-auto scroll-area-lernio">
          <DropdownMenuLabel className="text-meta uppercase tracking-wider text-muted-foreground">All modes</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {secondary.map((m) => {
            const Icon = MODE_ICONS[m.icon] || Sparkles
            const active = value === m.key
            return (
              <DropdownMenuItem
                key={m.key}
                onClick={() => onChange(m.key)}
                className={cn(
                  'gap-2.5 cursor-pointer p-2',
                  active && 'bg-primary/10'
                )}
              >
                <span className={cn(
                  'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                  active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-medium', active && 'text-primary')}>{m.label}</p>
                  <p className="text-meta text-muted-foreground truncate">{m.desc}</p>
                </div>
                {active && <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context bar (subject / unit / topic dropdowns)
// ---------------------------------------------------------------------------
function ContextBar({
  subjects,
  subjectId,
  unitNumber,
  topicId,
  onSubjectChange,
  onUnitChange,
  onTopicChange,
}: {
  subjects: { id: string; name: string; units: { id: string; number: number; title: string; topics: { id: string; title: string }[] }[] }[]
  subjectId: string
  unitNumber: string
  topicId: string
  onSubjectChange: (v: string) => void
  onUnitChange: (v: string) => void
  onTopicChange: (v: string) => void
}) {
  const subject = subjects.find((s) => s.id === subjectId)
  const units = subject?.units || []
  const unit = units.find((u) => String(u.number) === unitNumber)
  const topics = unit?.topics || []

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 p-2 rounded-lg bg-muted/40 border border-border">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Context:</span>
      </div>
      <Select value={subjectId} onValueChange={onSubjectChange}>
        <SelectTrigger size="sm" className="h-7 w-auto min-w-[120px] text-xs">
          <SelectValue placeholder="Subject" />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id} className="text-xs">
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={unitNumber}
        onValueChange={onUnitChange}
        disabled={!subject}
      >
        <SelectTrigger size="sm" className="h-7 w-auto min-w-[120px] text-xs">
          <SelectValue placeholder="Unit" />
        </SelectTrigger>
        <SelectContent>
          {units.map((u) => (
            <SelectItem key={u.id} value={String(u.number)} className="text-xs">
              U{u.number}. {u.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={topicId}
        onValueChange={onTopicChange}
        disabled={!unit}
      >
        <SelectTrigger size="sm" className="h-7 w-auto min-w-[120px] text-xs">
          <SelectValue placeholder="Topic" />
        </SelectTrigger>
        <SelectContent>
          {topics.map((t) => (
            <SelectItem key={t.id} value={t.id} className="text-xs">
              {t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(subjectId || unitNumber || topicId) && (
        <button
          onClick={() => {
            onSubjectChange('')
            onUnitChange('')
            onTopicChange('')
          }}
          className="text-meta text-muted-foreground hover:text-foreground underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
function UserMessage({ message }: { message: TutorMessage }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-sm">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </motion.div>
  )
}

function AssistantMessage({
  message,
  onRegenerate,
  onFeedback,
  onFollowUp,
  onSpeak,
  onStopSpeak,
  isSpeaking,
  isSpeakLoading,
}: {
  message: TutorMessage
  onRegenerate: () => void
  onFeedback: (t: 'up' | 'down') => void
  onFollowUp: (p: string) => void
  onSpeak: (text: string) => void
  onStopSpeak: () => void
  isSpeaking: boolean
  isSpeakLoading: boolean
}) {
  const [copied, setCopied] = useState(false)
  const grounding = groundingBadge(message.groundingStatus)
  const citations = parseJsonArray<Citation>(message.citations)
  const followUps = parseJsonArray<string>(message.followUps)
  const feedback = message.feedback as 'up' | 'down' | undefined

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="shrink-0 mt-0.5">
        <Mascot mascot="leo" state="explaining" size={32} animated={false} />
      </div>
      <div className="flex-1 min-w-0 max-w-[calc(100%-2.5rem)]">
        <Card className="rounded-2xl rounded-tl-sm shadow-sm">
          <CardContent className="p-3.5">
            {/* Grounding badge */}
            <div className="flex items-center justify-between mb-2 gap-2">
              <Badge
                variant="outline"
                className={cn('text-meta gap-1 px-1.5 h-5', grounding.className)}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', grounding.dot)} />
                {grounding.label}
              </Badge>
              {message.mode && (
                <Badge variant="secondary" className="text-meta h-5 font-normal">
                  {MODE_LABEL[message.mode] || message.mode}
                </Badge>
              )}
            </div>

            {/* Markdown content */}
            <div className="lesson-prose tutor-prose text-sm">
              <ReactMarkdown
                components={{
                  pre: ({ children }) => (
                    <pre className="my-3 rounded-lg bg-zinc-900 dark:bg-black/60 border border-zinc-800 dark:border-zinc-800 p-3 overflow-x-auto text-xs">
                      {children}
                    </pre>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isBlock = /language-/.test(className || '')
                    if (isBlock) {
                      return (
                        <code
                          className={cn('font-mono text-zinc-100', className)}
                          {...props}
                        >
                          {children}
                        </code>
                      )
                    }
                    return (
                      <code
                        className="font-mono bg-muted text-foreground px-1.5 py-0.5 rounded text-[0.85em]"
                        {...props}
                      >
                        {children}
                      </code>
                    )
                  },
                  a: ({ children, ...props }) => (
                    <a
                      className="text-primary underline underline-offset-2"
                      target="_blank"
                      rel="noreferrer noopener"
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Citations */}
            {citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-meta font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  Citations
                </p>
                <div className="space-y-1">
                  {citations.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs rounded-md bg-muted/50 px-2 py-1.5"
                    >
                      <span className="shrink-0 mt-0.5 h-4 w-4 rounded bg-primary/15 text-primary text-meta font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {c.title || 'Source'}
                        </p>
                        {c.location && (
                          <p className="text-meta text-muted-foreground truncate">
                            {c.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {followUps.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {followUps.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => onFollowUp(f)}
                    className="text-meta px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent hover:border-primary/30 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-primary" />
                    {f}
                  </button>
                ))}
              </div>
            )}

            {/* Action bar */}
            <div className="mt-2.5 pt-2 border-t border-border flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Copy"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => (isSpeaking ? onStopSpeak() : onSpeak(message.content))}
                    className={cn(
                      'p-1.5 rounded-md hover:bg-accent transition-colors',
                      isSpeaking
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    aria-label={isSpeaking ? 'Stop voice' : 'Read aloud'}
                  >
                    {isSpeakLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSpeaking ? (
                      <span className="flex items-end gap-[1.5px] h-3.5 w-3.5" aria-hidden>
                        <span className="eq-bar h-2" style={{ animationDelay: '0ms' }} />
                        <span className="eq-bar h-3" style={{ animationDelay: '120ms' }} />
                        <span className="eq-bar h-2.5" style={{ animationDelay: '240ms' }} />
                      </span>
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isSpeaking ? 'Stop voice' : 'Read aloud'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onFeedback('up')}
                    className={cn(
                      'p-1.5 rounded-md hover:bg-accent transition-colors',
                      feedback === 'up'
                        ? 'text-emerald-500'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Thumbs up"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Good response</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onFeedback('down')}
                    className={cn(
                      'p-1.5 rounded-md hover:bg-accent transition-colors',
                      feedback === 'down'
                        ? 'text-rose-500'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-label="Thumbs down"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Needs improvement</TooltipContent>
              </Tooltip>
              <div className="flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onRegenerate}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Regenerate"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Regenerate</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Thinking indicator
// ---------------------------------------------------------------------------
function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-2.5"
    >
      <div className="shrink-0 mt-0.5">
        <Mascot mascot="leo" state="thinking" size={32} />
      </div>
      <Card className="rounded-2xl rounded-tl-sm shadow-sm">
        <CardContent className="p-3.5 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">LEO is thinking</span>
          <div className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse [animation-delay:300ms]" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function ErrorRetry({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry} className="h-7 text-xs gap-1">
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Chat input — text + voice + auto-read toggle + TTS controls
// ---------------------------------------------------------------------------
function ChatInput({
  mode,
  disabled,
  onSend,
  onVoiceComplete,
  autoRead,
  onToggleAutoRead,
  ttsPlaying,
  ttsLoading,
  onStopTts,
}: {
  mode: TutorMode
  disabled: boolean
  onSend: (text: string) => void
  onVoiceComplete: (base64: string, mimeType: string) => void | Promise<void>
  autoRead: boolean
  onToggleAutoRead: (v: boolean) => void
  ttsPlaying: boolean
  ttsLoading: boolean
  onStopTts: () => void
}) {
  const [value, setValue] = useState('')
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false)
  // Lazy initialiser so we don't need a useEffect to load prefs from localStorage.
  const [voicePref, setVoicePref] = useState<string>(() => {
    if (typeof window === 'undefined') return 'tongtong'
    return localStorage.getItem('lernio.tts.voice') || 'tongtong'
  })
  const [speedPref, setSpeedPref] = useState<number>(() => {
    if (typeof window === 'undefined') return 1.0
    const raw = parseFloat(localStorage.getItem('lernio.tts.speed') || '1.0')
    return Number.isFinite(raw) ? Math.min(2, Math.max(0.5, raw)) : 1.0
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const quickPrompts = MODE_QUICK_PROMPTS[mode] || DEFAULT_QUICK_PROMPTS

  const recorder = useVoiceRecorder({ onComplete: onVoiceComplete })

  // Show recorder errors as toasts.
  useEffect(() => {
    if (recorder.error) toast.error('Voice input', { description: recorder.error })
  }, [recorder.error])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  const submit = () => {
    if (!value.trim() || disabled) return
    onSend(value)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  // Toggle voice recording
  const toggleRecording = () => {
    if (recorder.recording) {
      recorder.stop()
    } else {
      recorder.start()
    }
  }

  return (
    <div className="mt-3 space-y-2">
      {/* Quick prompt chips + voice prefs row */}
      <div className="flex flex-wrap items-center gap-1.5">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => !disabled && onSend(p)}
            disabled={disabled}
            className="text-meta px-2.5 py-1 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {p}
          </button>
        ))}
        <div className="flex-1" />
        {/* Auto-read toggle */}
        <button
          onClick={() => onToggleAutoRead(!autoRead)}
          className={cn(
            'tab-pill text-meta px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1',
            autoRead
              ? 'border-primary/30 text-primary bg-primary/10'
              : 'border-border text-muted-foreground bg-card hover:bg-accent',
          )}
          data-active={autoRead}
          aria-pressed={autoRead}
          title="Automatically read aloud LEO's replies"
        >
          {autoRead ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          Auto-read
        </button>
        {/* Stop TTS button — only visible while playing */}
        {(ttsPlaying || ttsLoading) && (
          <button
            onClick={onStopTts}
            className="text-meta px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
            title="Stop voice playback"
          >
            {ttsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Square className="h-3 w-3" />}
            Stop
          </button>
        )}
        {/* Voice settings popover */}
        <Popover open={voiceSettingsOpen} onOpenChange={setVoiceSettingsOpen}>
          <PopoverTrigger asChild>
            <button
              className="text-meta px-2 py-1 rounded-full border border-border bg-card hover:bg-accent transition-colors flex items-center gap-1 text-muted-foreground"
              title="Voice settings"
              aria-label="Voice settings"
            >
              <Settings2 className="h-3 w-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                  <AudioLines className="h-3.5 w-3.5 text-primary" />
                  Voice settings
                </p>
                <p className="text-meta text-muted-foreground">
                  Choose how LEO sounds when reading replies aloud.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-meta text-muted-foreground">Voice</label>
                <Select
                  value={voicePref}
                  onValueChange={(v) => {
                    setVoicePref(v)
                    setTtsPrefs({ voice: v })
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((v) => (
                      <SelectItem key={v.value} value={v.value} className="text-xs">
                        <div className="flex flex-col">
                          <span>{v.label}</span>
                          <span className="text-meta text-muted-foreground">{v.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-meta text-muted-foreground">Speed</label>
                  <span className="text-meta tabular-nums font-medium">{speedPref.toFixed(1)}×</span>
                </div>
                <Slider
                  value={[speedPref]}
                  onValueChange={(v) => {
                    const s = v[0]
                    setSpeedPref(s)
                    setTtsPrefs({ speed: s })
                  }}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                />
                <div className="flex justify-between text-meta text-muted-foreground">
                  <span>0.5×</span>
                  <span>1.0×</span>
                  <span>2.0×</span>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Recording indicator */}
      {recorder.recording && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="voice-pill rounded-lg px-3 py-2 flex items-center gap-3"
        >
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 rec-pulse shrink-0" />
          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
            Recording…
          </span>
          <span className="flex items-end gap-0.5 h-4">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="wave-bar h-full"
                style={{
                  animationDelay: `${i * 90}ms`,
                  height: '100%',
                  background: 'var(--primary)',
                }}
              />
            ))}
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.floor(recorder.elapsedMs / 1000)}s
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={recorder.cancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={recorder.stop}
          >
            <Send className="h-3 w-3" />
            Send
          </Button>
        </motion.div>
      )}

      {/* Input + send + mic */}
      <div className="relative flex items-end gap-2 rounded-xl border border-border bg-card p-2 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15 transition-colors">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={recorder.recording ? 'Listening… speak now' : 'Ask LEO anything… (Enter to send, Shift+Enter for newline)'}
          disabled={disabled || recorder.recording}
          rows={1}
          className="min-h-[40px] max-h-40 resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent px-1.5 py-1.5 text-sm"
        />
        {/* Mic button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleRecording}
              disabled={disabled}
              className={cn(
                'h-9 w-9 shrink-0 rounded-lg transition-colors',
                recorder.recording && 'text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20',
              )}
              aria-label={recorder.recording ? 'Stop recording' : 'Start voice input'}
            >
              {recorder.recording ? (
                <span className="h-3 w-3 rounded-sm bg-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{recorder.recording ? 'Stop & transcribe' : 'Voice input'}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              onClick={submit}
              disabled={!value.trim() || disabled}
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label="Send message"
            >
              {disabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send (Enter)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
