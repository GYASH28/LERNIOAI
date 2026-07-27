'use client'

import { useCallback, useEffect, useMemo, useState, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  LayoutDashboard, BookOpen, PenTool, Bot, FlaskConical, Code2,
  FileText, RotateCw, Library, CalendarCheck, BarChart3, User,
  Search, CornerDownLeft, ArrowUp, ArrowDown, Sun, Moon, Sparkles,
  Layers, PlayCircle, MessageCircle, Trophy, Award, Bell, Users, ClipboardList,
} from 'lucide-react'
import { usePrefs } from '@/components/theme-provider'
import type { ApiResult, ViewKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { routeForView } from '@/lib/routes'
import type { LearningSearchResult, LearningSearchResultKind } from '@/features/learning/utils/learning-search'

interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  group: 'Learning' | 'Navigate' | 'Actions' | 'Appearance'
  keywords?: string
  action: () => void
}

const NAV_ITEMS: { key: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hint: 'Home & summary' },
  { key: 'learn', label: 'Learn', icon: BookOpen, hint: '5-mode lessons' },
  { key: 'practice', label: 'Practice', icon: PenTool, hint: 'Adaptive questions' },
  { key: 'tutor', label: 'AI Tutor', icon: Bot, hint: '17 LEO modes' },
  { key: 'labs', label: 'Interactive Labs', icon: FlaskConical, hint: 'DS · 8086 · DC' },
  { key: 'coding', label: 'Coding Lab', icon: Code2, hint: 'C++ challenges' },
  { key: 'exams', label: 'Exams', icon: FileText, hint: 'Mock & chapter tests' },
  { key: 'revision', label: 'Smart Revision', icon: RotateCw, hint: 'SM-2 flashcards' },
  { key: 'materials', label: 'Materials', icon: Library, hint: 'Notes & PDFs' },
  { key: 'planner', label: 'Study Planner', icon: CalendarCheck, hint: 'Daily tasks' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, hint: 'Progress charts' },
  { key: 'community', label: 'Community', icon: MessageCircle, hint: 'Q&A and discussions' },
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy, hint: 'XP rankings' },
  { key: 'achievements', label: 'Achievements', icon: Award, hint: 'Badges & milestones' },
  { key: 'class', label: 'My Class', icon: Users, hint: 'Classmates & timetable' },
  { key: 'attendance', label: 'Attendance', icon: ClipboardList, hint: 'Attendance records' },
  { key: 'notifications', label: 'Notifications', icon: Bell, hint: 'Inbox' },
  { key: 'profile', label: 'Profile', icon: User, hint: 'Account & prefs' },
]

type PaletteState = { query: string; activeIdx: number }
type PaletteAction =
  | { type: 'setQuery'; query: string }
  | { type: 'moveActive'; delta: -1 | 1; max: number }
  | { type: 'setActive'; idx: number }
  | { type: 'reset' }

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'setQuery':
      // Any query change resets the active index to the first result.
      return { query: action.query, activeIdx: 0 }
    case 'moveActive': {
      const next = state.activeIdx + action.delta
      const clamped = Math.max(0, Math.min(next, action.max))
      return { ...state, activeIdx: clamped }
    }
    case 'setActive':
      return { ...state, activeIdx: action.idx }
    case 'reset':
      return { query: '', activeIdx: 0 }
    default:
      return state
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [state, dispatch] = useReducer(paletteReducer, { query: '', activeIdx: 0 })
  const [learningResults, setLearningResults] = useState<LearningSearchResult[]>([])
  const [learningSearchPending, setLearningSearchPending] = useState(false)
  const { query, activeIdx } = state
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { setPref } = usePrefs()
  const navigateToView = useCallback((view: ViewKey) => {
    router.push(routeForView(view))
    setOpen(false)
  }, [router])

  const navigateToHref = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
  }, [router])

  const updateQuery = useCallback((nextQuery: string) => {
    dispatch({ type: 'setQuery', query: nextQuery })
    if (nextQuery.trim().length < 2) {
      setLearningResults([])
      setLearningSearchPending(false)
    }
  }, [])

  // Global Cmd/Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Focus input when the palette opens. The setState-on-close is intentionally
  // avoided here — we reset via dispatch('reset') in the onOpenChange handler
  // instead, so no synchronous setState happens inside the effect.
  const prevOpenRef = useRef(false)
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open
    if (open && !wasOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    const q = query.trim()
    if (!open || q.length < 2) {
      return undefined
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLearningSearchPending(true)
      try {
        const response = await fetch(`/api/search/learning?q=${encodeURIComponent(q)}&limit=8`, {
          signal: controller.signal,
          cache: 'no-store',
        })
        const payload = await response.json() as ApiResult<{ results: LearningSearchResult[] }>
        if (!controller.signal.aborted) {
          setLearningResults(payload.ok ? payload.data.results : [])
        }
      } catch {
        if (!controller.signal.aborted) setLearningResults([])
      } finally {
        if (!controller.signal.aborted) setLearningSearchPending(false)
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, query])

  const items = useMemo<CommandItem[]>(() => {
    const learningItems: CommandItem[] = learningResults.map((result) => ({
      id: `learning-${result.id}`,
      label: result.title,
      hint: result.subtitle,
      icon: iconForLearningResult(result.kind),
      group: 'Learning',
      keywords: `${result.kind} ${result.title} ${result.subtitle} ${result.subjectCode || ''}`,
      action: () => navigateToHref(result.href),
    }))

    const navItems: CommandItem[] = NAV_ITEMS.map((n) => ({
      id: `nav-${n.key}`,
      label: n.label,
      hint: n.hint,
      icon: n.icon,
      group: 'Navigate',
      keywords: `${n.label} ${n.hint} ${n.key}`,
      action: () => navigateToView(n.key),
    }))

    const actionItems: CommandItem[] = [
      {
        id: 'action-ask-leo',
        label: 'Ask LEO a question',
        hint: 'Open AI Tutor',
        icon: Sparkles,
        group: 'Actions',
        keywords: 'ai tutor chat ask leo help',
        action: () => navigateToView('tutor'),
      },
      {
        id: 'action-start-practice',
        label: 'Start a practice session',
        hint: 'Adaptive questions',
        icon: PenTool,
        group: 'Actions',
        keywords: 'practice quiz questions adaptive',
        action: () => navigateToView('practice'),
      },
      {
        id: 'action-mock-exam',
        label: 'Start a mock exam',
        hint: 'Full-screen timed exam',
        icon: FileText,
        group: 'Actions',
        keywords: 'exam mock test chapter',
        action: () => navigateToView('exams'),
      },
      {
        id: 'action-revision',
        label: 'Review due flashcards',
        hint: 'SM-2 spaced repetition',
        icon: RotateCw,
        group: 'Actions',
        keywords: 'revision flashcards review sm2',
        action: () => navigateToView('revision'),
      },
    ]

    const appearanceItems: CommandItem[] = [
      {
        id: 'theme-light',
        label: 'Switch to light mode',
        icon: Sun,
        group: 'Appearance',
        keywords: 'theme light mode bright',
        action: () => { setPref({ appearance: 'light' }); setOpen(false) },
      },
      {
        id: 'theme-dark',
        label: 'Switch to dark mode',
        icon: Moon,
        group: 'Appearance',
        keywords: 'theme dark mode night',
        action: () => { setPref({ appearance: 'dark' }); setOpen(false) },
      },
      {
        id: 'theme-system',
        label: 'Match system theme',
        icon: Sun,
        group: 'Appearance',
        keywords: 'theme system auto',
        action: () => { setPref({ appearance: 'system' }); setOpen(false) },
      },
    ]

    return [...learningItems, ...navItems, ...actionItems, ...appearanceItems]
  }, [learningResults, navigateToHref, navigateToView, setPref])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((it) => {
      const hay = `${it.label} ${it.hint || ''} ${it.keywords || ''} ${it.group}`.toLowerCase()
      return hay.includes(q)
    })
  }, [items, query])

  // Keyboard nav within results
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      dispatch({ type: 'moveActive', delta: 1, max: filtered.length - 1 })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      dispatch({ type: 'moveActive', delta: -1, max: filtered.length - 1 })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const it = filtered[activeIdx]
      if (it) it.action()
    }
  }

  // Group filtered items
  const grouped = useMemo(() => {
    const g: Record<string, CommandItem[]> = {}
    for (const it of filtered) {
      if (!g[it.group]) g[it.group] = []
      g[it.group].push(it)
    }
    return g
  }, [filtered])

  // Flat index lookup for highlight
  const flatWithIndex = filtered

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          dispatch({ type: 'reset' })
          setLearningResults([])
          setLearningSearchPending(false)
        }
      }}
    >
      <DialogContent
        className="p-0 gap-0 overflow-hidden max-w-xl top-[20%] translate-y-0 cmdk-backdrop border-border/60 shadow-soft-lg"
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search views, actions, and appearance. Use arrow keys to navigate.
        </DialogDescription>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search views, actions, settings…"
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground focus:ring-0"
          />
          <kbd className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto scroll-area-lernio py-2">
          {flatWithIndex.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium">
                {learningSearchPending ? 'Searching learning...' : 'No matches'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Try a different keyword.</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-4 py-1 text-meta font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group}
                </div>
                {list.map((it) => {
                  const idx = flatWithIndex.findIndex((x) => x.id === it.id)
                  const active = idx === activeIdx
                  const Icon = it.icon
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => dispatch({ type: 'setActive', idx })}
                      onClick={it.action}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                        active ? 'bg-primary/10' : 'hover:bg-muted/40'
                      )}
                    >
                      <span className={cn(
                        'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                        active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium block truncate">{it.label}</span>
                        {it.hint && (
                          <span className="text-meta text-muted-foreground block truncate">{it.hint}</span>
                        )}
                      </span>
                      {active && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/30">
          <div className="flex items-center gap-3 text-meta text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              <ArrowDown className="h-3 w-3" />
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              select
            </span>
          </div>
          <span className="text-meta text-muted-foreground">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function iconForLearningResult(kind: LearningSearchResultKind): React.ComponentType<{ className?: string }> {
  switch (kind) {
    case 'semester':
      return CalendarCheck
    case 'subject':
      return BookOpen
    case 'unit':
      return Layers
    case 'topic':
      return Sparkles
    case 'lesson':
      return PlayCircle
    case 'notes':
      return FileText
    case 'resource':
      return Library
  }
}
