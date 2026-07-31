'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  Flame,
  Gamepad2,
  LibraryBig,
  Pause,
  PenTool,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Video,
  WandSparkles,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'
import type { MascotKey, MascotState } from '@/lib/types'
import {
  ADAPTIVE_PATHS,
  DEFAULT_STUDENT_PROFILE,
  MASCOT_CATALOG,
  STUDENT_OS_STORAGE,
  buildDailyMissions,
  getAdaptivePath,
  type StudentLearningMode,
  type StudentLearningProfile,
} from '@/lib/student-os/catalog'
import { useLocalState } from '@/components/student-os/use-local-state'

interface StudentOSClientProps {
  userName: string
  programme: 'DCOMP' | 'DCIOT'
  semester: number
  dailyMinutes: number
  xp: number
  streak: number
}

interface MissionState {
  date: string
  completed: string[]
}

interface FocusState {
  completedSessions: number
  totalMinutes: number
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function minutesLabel(value: number) {
  if (value < 60) return `${value} min`
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

const categoryIcon = {
  learn: BookOpen,
  video: Video,
  practice: PenTool,
  revision: RotateCcw,
  coding: Code2,
  reflection: BrainCircuit,
}

const quickActions = [
  { href: '/learn', label: 'Learn', description: 'Continue a lesson', icon: BookOpen },
  { href: '/tutor', label: 'Ask LEO', description: 'Explain anything', icon: WandSparkles },
  { href: '/practice', label: 'Practice', description: 'Adaptive questions', icon: Target },
  { href: '/revision', label: 'Revision', description: 'Due flashcards', icon: RotateCcw },
  { href: '/games', label: 'Game Lab', description: 'Curriculum mini-games', icon: Gamepad2 },
  { href: '/notebook', label: 'Notebook', description: 'Save useful knowledge', icon: LibraryBig },
  { href: '/coding', label: 'Coding Lab', description: 'Predict, run, debug', icon: Code2 },
  { href: '/planner', label: 'Planner', description: 'Build a realistic plan', icon: CalendarCheck },
]

export function StudentOSClient({
  userName,
  programme,
  semester,
  dailyMinutes,
  xp,
  streak,
}: StudentOSClientProps) {
  const profileFallback: StudentLearningProfile = {
    ...DEFAULT_STUDENT_PROFILE,
    programme,
    semester,
    dailyMinutes,
    weeklyGoalMinutes: dailyMinutes * 5,
  }
  const today = localDateKey()
  const [profile, setProfile, profileReady] = useLocalState(STUDENT_OS_STORAGE.profile, profileFallback)
  const [missionState, setMissionState] = useLocalState<MissionState>(STUDENT_OS_STORAGE.missions, {
    date: today,
    completed: [],
  })
  const [focusStats, setFocusStats] = useLocalState<FocusState>(STUDENT_OS_STORAGE.focus, {
    completedSessions: 0,
    totalMinutes: 0,
  })
  const [selectedPath, setSelectedPath] = useState<StudentLearningMode>(profile.learningMode)
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [showWhy, setShowWhy] = useState(false)

  useEffect(() => {
    setSelectedPath(profile.learningMode)
  }, [profile.learningMode])

  useEffect(() => {
    if (missionState.date === today) return
    setMissionState({ date: today, completed: [] })
  }, [missionState.date, setMissionState, today])

  useEffect(() => {
    if (!focusRunning) return
    if (secondsLeft <= 0) {
      setFocusRunning(false)
      setFocusStats((current) => ({
        completedSessions: current.completedSessions + 1,
        totalMinutes: current.totalMinutes + focusMinutes,
      }))
      toast.success('Focus session complete. Take a short break before the next mission.')
      return
    }
    const timer = window.setInterval(() => setSecondsLeft((value) => value - 1), 1000)
    return () => window.clearInterval(timer)
  }, [focusMinutes, focusRunning, secondsLeft, setFocusStats])

  const missions = useMemo(
    () => buildDailyMissions(profile.dailyMinutes, selectedPath),
    [profile.dailyMinutes, selectedPath],
  )
  const completedIds = missionState.date === today ? missionState.completed : []
  const completedMissions = missions.filter((mission) => completedIds.includes(mission.id))
  const completedMinutes = completedMissions.reduce((sum, mission) => sum + mission.minutes, 0)
  const plannedMinutes = missions.reduce((sum, mission) => sum + mission.minutes, 0)
  const earnedMissionXp = completedMissions.reduce((sum, mission) => sum + mission.xp, 0)
  const progress = missions.length > 0 ? Math.round((completedMissions.length / missions.length) * 100) : 0
  const activePath = getAdaptivePath(selectedPath)
  const activeMascot = MASCOT_CATALOG.find((item) => item.key === profile.mascot) ?? MASCOT_CATALOG[0]
  const mascotState: MascotState = progress === 100 ? 'achievement' : focusRunning ? 'thinking' : 'greeting'

  const recommendation = missions.find((mission) => !completedIds.includes(mission.id)) ?? missions[0]
  const firstName = userName.split(' ')[0] || 'Learner'

  const toggleMission = (missionId: string) => {
    const isCompleted = completedIds.includes(missionId)
    setMissionState({
      date: today,
      completed: isCompleted
        ? completedIds.filter((id) => id !== missionId)
        : [...completedIds, missionId],
    })
    if (!isCompleted) toast.success('Mission completed. Progress was saved on this device.')
  }

  const choosePath = (mode: StudentLearningMode) => {
    setSelectedPath(mode)
    setProfile((current) => ({ ...current, learningMode: mode }))
    setMissionState({ date: today, completed: [] })
    toast.success(`${getAdaptivePath(mode).title} path activated.`)
  }

  const chooseMascot = (mascot: MascotKey) => {
    setProfile((current) => ({ ...current, mascot }))
  }

  const setTimerLength = (minutes: number) => {
    setFocusRunning(false)
    setFocusMinutes(minutes)
    setSecondsLeft(minutes * 60)
  }

  const resetTimer = () => {
    setFocusRunning(false)
    setSecondsLeft(focusMinutes * 60)
  }

  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  if (!profileReady) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <Mascot mascot="leo" state="thinking" size={88} />
          <p className="mt-3 text-sm text-muted-foreground">Preparing your learning path…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-violet-500/5 to-background p-5 sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <span>{profile.programme}</span>
              <span aria-hidden="true">•</span>
              <span>Semester {profile.semester}</span>
              <span aria-hidden="true">•</span>
              <span>{activePath.title}</span>
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              {progress === 100 ? `Daily plan complete, ${firstName}.` : `Your next useful step, ${firstName}.`}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              {progress === 100
                ? 'You completed every planned mission. Use the remaining time for a weak topic, a game or a short recap.'
                : recommendation.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href={recommendation.href}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
              >
                <Play className="h-4 w-4" />
                {progress === 100 ? 'Choose bonus study' : `Start: ${recommendation.title}`}
              </Link>
              <button
                type="button"
                onClick={() => setShowWhy((value) => !value)}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                <Sparkles className="h-4 w-4" />
                Why this?
              </button>
              <Link
                href="/learning-profile"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold hover:bg-accent"
              >
                Adjust my plan
              </Link>
            </div>

            {showWhy && (
              <div className="mt-4 max-w-2xl rounded-2xl border border-primary/20 bg-background/75 p-4 text-sm leading-6">
                Lernio selected this because your active path is <strong>{activePath.title}</strong>, you planned{' '}
                <strong>{profile.dailyMinutes} minutes</strong>, and this is the first unfinished mission in today’s sequence.
                Recommendations are explainable and can always be changed.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-border bg-background/75 p-5 text-center shadow-sm backdrop-blur">
            <div className={cn('mx-auto w-fit', !profile.reducedMotion && focusRunning && 'animate-pulse')}>
              <Mascot mascot={profile.mascot} state={mascotState} size={122} />
            </div>
            <p className="mt-2 text-lg font-bold">{activeMascot.name}</p>
            <p className="text-xs font-semibold text-primary">{activeMascot.specialty}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">“{activeMascot.greeting}”</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Today', value: `${completedMissions.length}/${missions.length}`, note: 'missions finished', icon: CheckCircle2 },
          { label: 'Study time', value: minutesLabel(completedMinutes), note: `${minutesLabel(plannedMinutes)} planned`, icon: Clock3 },
          { label: 'Learning XP', value: String(xp + earnedMissionXp), note: `+${earnedMissionXp} today`, icon: Zap },
          { label: 'Momentum', value: `${streak} days`, note: `${progress}% daily progress`, icon: Flame },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</span>
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Today’s journey</p>
              <h2 className="mt-1 text-2xl font-bold">Daily missions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Small tasks sized to your available study time.</p>
            </div>
            <div className="min-w-40">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{progress}% complete</span>
                <span>{minutesLabel(completedMinutes)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {missions.map((mission, index) => {
              const Icon = categoryIcon[mission.category]
              const completed = completedIds.includes(mission.id)
              return (
                <div
                  key={mission.id}
                  className={cn(
                    'group flex flex-col gap-3 rounded-2xl border p-4 transition-colors sm:flex-row sm:items-center',
                    completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background hover:border-primary/30',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                      completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary',
                    )}
                    aria-label={completed ? `Mark ${mission.title} incomplete` : `Mark ${mission.title} complete`}
                  >
                    {completed ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('font-semibold', completed && 'line-through opacity-70')}>
                        <span className="mr-2 text-xs text-muted-foreground">{index + 1}.</span>
                        {mission.title}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{mission.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{mission.minutes} min</p>
                      <p>+{mission.xp} XP</p>
                    </div>
                    <Link
                      href={mission.href}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-accent"
                      aria-label={`Open ${mission.title}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Deep work</p>
                <h2 className="mt-1 text-xl font-bold">Focus timer</h2>
              </div>
              <TimerReset className="h-5 w-5 text-primary" />
            </div>
            <div className="my-6 text-center">
              <p className="font-mono text-5xl font-bold tabular-nums tracking-tight">{timerLabel}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {focusRunning ? 'Stay with one task until the timer ends.' : 'Choose a session and remove distractions.'}
              </p>
            </div>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[15, 25, 45].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setTimerLength(minutes)}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-semibold',
                    focusMinutes === minutes ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
                  )}
                >
                  {minutes} min
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFocusRunning((value) => !value)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {focusRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {focusRunning ? 'Pause' : 'Start focus'}
              </button>
              <button
                type="button"
                onClick={resetTimer}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-accent"
                aria-label="Reset focus timer"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="font-bold tabular-nums">{focusStats.completedSessions}</p>
                <p className="text-[11px] text-muted-foreground">sessions</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="font-bold tabular-nums">{minutesLabel(focusStats.totalMinutes)}</p>
                <p className="text-[11px] text-muted-foreground">focused</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Choose your guide</h2>
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {MASCOT_CATALOG.map((mascot) => (
                <button
                  key={mascot.key}
                  type="button"
                  onClick={() => chooseMascot(mascot.key)}
                  className={cn(
                    'rounded-xl border p-1.5 transition-transform hover:-translate-y-0.5',
                    profile.mascot === mascot.key ? 'border-primary bg-primary/10' : 'border-border bg-background',
                  )}
                  title={`${mascot.name}: ${mascot.specialty}`}
                >
                  <Mascot mascot={mascot.key} state={profile.mascot === mascot.key ? 'greeting' : 'idle'} size={46} />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{activeMascot.description}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Adaptive routes</p>
            <h2 className="mt-1 text-2xl font-bold">Change how Lernio teaches today</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your content stays the same; the order and intensity change.</p>
          </div>
          <Link href="/learning-profile" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Full preferences <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {ADAPTIVE_PATHS.map((path) => (
            <button
              key={path.id}
              type="button"
              onClick={() => choosePath(path.id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5',
                path.accent,
                selectedPath === path.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold">{path.title}</h3>
                {selectedPath === path.id && <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{path.description}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-foreground/70">{path.cadence}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Learning tools</p>
            <h2 className="mt-1 text-2xl font-bold">Everything stays connected</h2>
          </div>
          <Link href="/analytics" className="hidden items-center gap-1 text-sm font-semibold text-primary sm:flex">
            View analytics <BarChart3 className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <action.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-bold">{action.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
              <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Open <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Weekly learning goal</h2>
              <p className="text-xs text-muted-foreground">Progress is based on focused activity, not decorative clicks.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.round((focusStats.totalMinutes / Math.max(1, profile.weeklyGoalMinutes)) * 100))}%` }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">
              {focusStats.totalMinutes}/{profile.weeklyGoalMinutes} min
            </span>
          </div>
        </div>
        <Link
          href="/games"
          className="group rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-5"
        >
          <Gamepad2 className="h-6 w-6 text-primary" />
          <h2 className="mt-3 font-bold">Curriculum Game Lab</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Train binary, networks, code order and concept recall in short sessions.</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Play now <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </section>
    </div>
  )
}
