'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Timer, Play, Pause, Square, Coffee, Brain, RotateCcw, X, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'

type Phase = 'focus' | 'break' | 'idle'
type Activity = 'learn' | 'practice' | 'tutor' | 'lab' | 'coding' | 'exam'

const PRESETS = [
  { label: 'Pomodoro 25 / 5', focus: 25, brk: 5 },
  { label: 'Deep 50 / 10', focus: 50, brk: 10 },
  { label: 'Sprint 15 / 3', focus: 15, brk: 3 },
  { label: 'Custom', focus: 25, brk: 5, custom: true },
]

const ACTIVITY_LABEL: Record<Activity, string> = {
  learn: 'Learn',
  practice: 'Practice',
  tutor: 'AI Tutor',
  lab: 'Lab',
  coding: 'Coding',
  exam: 'Exam',
}

interface FocusTimerState {
  open: boolean
  presetIdx: number
  focusMins: number
  breakMins: number
  activity: Activity
  phase: Phase
  remaining: number // seconds
  startedAt: number | null // epoch ms
  completedFocusSecs: number // accumulated across this session
}

const STORAGE_KEY = 'lernio-focus-timer-state'

function loadState(): Partial<FocusTimerState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function saveState(s: Partial<FocusTimerState>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function FocusTimerWidget() {
  const { subjects, pushMascotToast, addXp } = useAppStore()
  const [open, setOpen] = useState(false)
  const [subjectId, setSubjectId] = useState<string>('')

  const persisted = useRef<Partial<FocusTimerState>>(loadState())
  const [state, setState] = useState<FocusTimerState>(() => ({
    open: false,
    presetIdx: persisted.current.presetIdx ?? 0,
    focusMins: persisted.current.focusMins ?? 25,
    breakMins: persisted.current.breakMins ?? 5,
    activity: (persisted.current.activity as Activity) ?? 'learn',
    phase: 'idle',
    remaining: (persisted.current.focusMins ?? 25) * 60,
    startedAt: null,
    completedFocusSecs: 0,
  }))

  // Persist non-runtime state
  useEffect(() => {
    saveState({
      presetIdx: state.presetIdx,
      focusMins: state.focusMins,
      breakMins: state.breakMins,
      activity: state.activity,
    })
  }, [state.presetIdx, state.focusMins, state.breakMins, state.activity])

  // Tick
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittingRef = useRef(false)

  const stopTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const logFocusSession = useCallback(
    async (focusSecs: number, startedAtMs: number) => {
      if (submittingRef.current) return null
      const durationMins = Math.max(1, Math.round(focusSecs / 60))
      submittingRef.current = true
      try {
        const res = await fetch('/api/study/focus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            durationMins,
            activity: state.activity,
            subjectId: subjectId || undefined,
            startedAt: new Date(startedAtMs).toISOString(),
            mode: 'pomodoro',
          }),
        })
        const json = await res.json()
        if (json.ok) {
          addXp(json.data.xpAwarded)
          pushMascotToast({
            mascot: 'leo',
            state: 'achievement',
            message: `Focus session logged! +${json.data.xpAwarded} XP for ${durationMins} focused min${
              json.data.bonusAwarded ? ' (incl. +5 deep-focus bonus)' : ''
            }.`,
          })
          return json.data
        } else {
          toast.error(json.error?.message || 'Could not save focus session.')
        }
      } catch {
        toast.error('Network error — focus session not saved.')
      } finally {
        submittingRef.current = false
      }
      return null
    },
    [state.activity, subjectId, addXp, pushMascotToast],
  )

  // Drift-free recalculation: derive `remaining` from the absolute deadline
  // (startedAt + phase duration) rather than decrementing by 1 each tick.
  // Background-tab setInterval throttling can't cause drift this way, and a
  // visibilitychange catch-up below completes any elapsed phase while hidden.
  const recalc = useCallback(() => {
    setState((s) => {
      if (s.phase === 'idle' || !s.startedAt) return s
      const phaseSecs = (s.phase === 'focus' ? s.focusMins : s.breakMins) * 60
      const deadline = s.startedAt + phaseSecs * 1000
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000))
      if (remaining > 0) return { ...s, remaining }
      // Phase complete
      if (s.phase === 'focus') {
        const completedSecs = s.completedFocusSecs + s.focusMins * 60
        void logFocusSession(s.focusMins * 60, s.startedAt)
        return {
          ...s,
          phase: 'break',
          remaining: s.breakMins * 60,
          startedAt: Date.now(),
          completedFocusSecs: completedSecs,
        }
      } else {
        pushMascotToast({
          mascot: 'leo',
          state: 'greeting',
          message: 'Break over — ready for the next focus block?',
        })
        return {
          ...s,
          phase: 'focus',
          remaining: s.focusMins * 60,
          startedAt: Date.now(),
        }
      }
    })
  }, [logFocusSession, pushMascotToast])

  // Tick handler — drift-free (computes from deadline, not decrement).
  useEffect(() => {
    if (state.phase === 'idle' || !state.startedAt) {
      stopTick()
      return
    }
    intervalRef.current = setInterval(recalc, 1000)
    return stopTick
  }, [state.phase, state.startedAt, recalc, stopTick])

  // Catch up immediately when the tab becomes visible again (the interval
  // is throttled to ~1/min in background tabs, so `remaining` may be stale).
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) recalc()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [recalc])

  // When focus mins change while idle, sync remaining
  useEffect(() => {
    if (state.phase === 'idle') {
      setState((s) => ({ ...s, remaining: s.focusMins * 60 }))
    }
  }, [state.focusMins, state.phase])

  const start = () => {
    setState((s) => ({
      ...s,
      phase: 'focus',
      remaining: s.remaining > 0 && s.phase === 'idle' ? s.remaining : s.focusMins * 60,
      startedAt: Date.now(),
    }))
  }
  const pause = () => {
    setState((s) => ({ ...s, phase: 'idle', startedAt: null }))
  }
  const stop = async () => {
    // If we accumulated any focused time that wasn't logged at phase-complete,
    // log it now (partial session).
    if (state.phase === 'focus' && state.startedAt) {
      const elapsed = state.focusMins * 60 - state.remaining
      if (elapsed >= 60) {
        await logFocusSession(elapsed, state.startedAt)
      }
    }
    setState((s) => ({
      ...s,
      phase: 'idle',
      startedAt: null,
      remaining: s.focusMins * 60,
      completedFocusSecs: 0,
    }))
  }

  const applyPreset = (idx: number) => {
    const p = PRESETS[idx]
    setState((s) => ({
      ...s,
      presetIdx: idx,
      focusMins: p.focus,
      breakMins: p.brk,
      phase: 'idle',
      startedAt: null,
      remaining: p.focus * 60,
    }))
  }

  const mins = Math.floor(state.remaining / 60)
  const secs = state.remaining % 60
  const totalForPhase = state.phase === 'break' ? state.breakMins * 60 : state.focusMins * 60
  const pct = totalForPhase > 0 ? ((totalForPhase - state.remaining) / totalForPhase) * 100 : 0

  // Floating button state — only show timer pill when active
  const isRunning = state.phase !== 'idle'

  return (
    <>
      {/* Floating action button — opens the timer dialog */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fab right-4 md:right-6 bottom-20 md:bottom-6 h-12 w-12 md:h-14 md:w-14 flex items-center justify-center bg-primary text-primary-foreground',
          isRunning && 'pulse-glow',
        )}
        aria-label="Open focus timer"
        data-cursor="clock"
      >
        <Timer className="h-5 w-5 md:h-6 md:w-6" />
        {isRunning && (
          <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-background text-foreground rounded-full px-1.5 py-0.5 border tabular-nums">
            {mins}:{secs.toString().padStart(2, '0')}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o && isRunning) pause() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" /> Focus Timer
            </DialogTitle>
            <DialogDescription>
              Pomodoro-style deep work. Sessions log to your study history and earn XP.
            </DialogDescription>
          </DialogHeader>

          {/* Phase indicator */}
          <div className="flex items-center justify-center gap-2">
            <Badge
              variant={state.phase === 'focus' ? 'default' : 'outline'}
              className={cn('gap-1.5', state.phase === 'focus' && 'pulse-glow')}
            >
              <Brain className="h-3 w-3" /> Focus
            </Badge>
            <span className="text-muted-foreground text-xs">→</span>
            <Badge
              variant={state.phase === 'break' ? 'default' : 'outline'}
              className={cn('gap-1.5', state.phase === 'break' && 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30')}
            >
              <Coffee className="h-3 w-3" /> Break
            </Badge>
          </div>

          {/* Big timer */}
          <div className="relative mx-auto my-2 h-44 w-44">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                strokeWidth="6"
                className="ring-track"
              />
              <circle
                cx="50" cy="50" r="44"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                className={cn(
                  'transition-all duration-500',
                  state.phase === 'break' ? 'stroke-emerald-500' : 'ring-fill',
                )}
                style={{
                  strokeDasharray: 2 * Math.PI * 44,
                  strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100),
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold tabular-nums">
                {mins}:{secs.toString().padStart(2, '0')}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                {state.phase === 'break' ? 'Break time' : state.phase === 'focus' ? 'Focusing' : 'Ready'}
              </div>
              {state.completedFocusSecs > 0 && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  +{Math.round(state.completedFocusSecs / 60)} min banked
                </div>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={pct} className="h-1.5" />

          {/* Controls */}
          <div className="flex gap-2">
            {state.phase === 'idle' ? (
              <Button onClick={start} className="flex-1 gap-2">
                <Play className="h-4 w-4" /> Start Focus
              </Button>
            ) : (
              <Button onClick={pause} variant="outline" className="flex-1 gap-2">
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            <Button
              onClick={stop}
              variant="ghost"
              className="gap-2 text-muted-foreground"
              disabled={state.phase === 'idle' && state.completedFocusSecs === 0}
            >
              <Square className="h-4 w-4" /> Stop &amp; Save
            </Button>
          </div>

          {/* Preset selector */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(i)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-all focus-ring',
                    state.presetIdx === i
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover-soft',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom duration sliders */}
          {state.presetIdx === 3 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">
                  Focus: {state.focusMins} min
                </label>
                <input
                  type="range"
                  min={5}
                  max={90}
                  step={5}
                  value={state.focusMins}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      focusMins: Number(e.target.value),
                      remaining: s.phase === 'idle' ? Number(e.target.value) * 60 : s.remaining,
                    }))
                  }
                  className="w-full mt-1 accent-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Break: {state.breakMins} min
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={state.breakMins}
                  onChange={(e) =>
                    setState((s) => ({ ...s, breakMins: Number(e.target.value) }))
                  }
                  className="w-full mt-1 accent-primary"
                />
              </div>
            </div>
          )}

          {/* Activity + subject */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Activity</label>
              <Select
                value={state.activity}
                onValueChange={(v) => setState((s) => ({ ...s, activity: v as Activity }))}
              >
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subject (optional)</label>
              <Select
                value={subjectId || '__none__'}
                onValueChange={(v) => setSubjectId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.shortName || s.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Earn <strong>1 XP per focused minute</strong> + <strong>+5 bonus</strong> for sessions ≥ 25 min.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
