'use client'

import { useEffect, useMemo, useState, useRef, useReducer } from 'react'
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
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { usePrefs } from '@/components/theme-provider'
import type { ViewKey } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  group: 'Navigate' | 'Actions' | 'Appearance'
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
  const { query, activeIdx } = state
  const inputRef = useRef<HTMLInputElement>(null)
  const { setView } = useAppStore()
  const { setPref } = usePrefs()

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

  const items = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = NAV_ITEMS.map((n) => ({
      id: `nav-${n.key}`,
      label: n.label,
      hint: n.hint,
      icon: n.icon,
      group: 'Navigate',
      keywords: `${n.label} ${n.hint} ${n.key}`,
      action: () => {
        setView(n.key)
        setOpen(false)
      },
    }))

    const actionItems: CommandItem[] = [
      {
        id: 'action-ask-leo',
        label: 'Ask LEO a question',
        hint: 'Open AI Tutor',
        icon: Sparkles,
        group: 'Actions',
        keywords: 'ai tutor chat ask leo help',
        action: () => { setView('tutor'); setOpen(false) },
      },
      {
        id: 'action-start-practice',
        label: 'Start a practice session',
        hint: 'Adaptive questions',
        icon: PenTool,
        group: 'Actions',
        keywords: 'practice quiz questions adaptive',
        action: () => { setView('practice'); setOpen(false) },
      },
      {
        id: 'action-mock-exam',
        label: 'Start a mock exam',
        hint: 'Full-screen timed exam',
        icon: FileText,
        group: 'Actions',
        keywords: 'exam mock test chapter',
        action: () => { setView('exams'); setOpen(false) },
      },
      {
        id: 'action-revision',
        label: 'Review due flashcards',
        hint: 'SM-2 spaced repetition',
        icon: RotateCw,
        group: 'Actions',
        keywords: 'revision flashcards review sm2',
        action: () => { setView('revision'); setOpen(false) },
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

    return [...navItems, ...actionItems, ...appearanceItems]
  }, [setView, setPref])

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
        if (!o) dispatch({ type: 'reset' })
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
            onChange={(e) => dispatch({ type: 'setQuery', query: e.target.value })}
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
              <p className="text-sm font-medium">No matches</p>
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
