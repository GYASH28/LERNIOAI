'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  Clock3,
  Code2,
  Flame,
  LibraryBig,
  Pause,
  PenTool,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Target,
  TimerReset,
  Video,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { useLocalState } from '@/components/student-os/use-local-state'
import {
  DEFAULT_STUDENT_PROFILE,
  STUDENT_OS_STORAGE,
  buildDailyMissions,
  getAdaptivePath,
  type StudentLearningProfile,
} from '@/lib/student-os/catalog'
import { cn } from '@/lib/utils'

export interface LearningOSSubjectSummary {
  code: string
  name: string
  category: string
  priority: string
  credits: number
  coverageFocus: string
  lessonCount: number
  videoCount: number
  hasDetailedNotes: boolean
  href: string
}

export interface LearningOSSemesterSummary {
  number: number
  subjects: LearningOSSubjectSummary[]
}

interface LearningOSHomeProps {
  userName: string
  programme: 'DCOMP' | 'DCIOT'
  currentSemester: number
  dailyMinutes: number
  xp: number
  streak: number
  revisionDue: number
  plannedLessons: number
  semesters: LearningOSSemesterSummary[]
}

interface MissionState {
  date: string
  completed: string[]
}

interface FocusState {
  completedSessions: number
  totalMinutes: number
}

const missionIcons: Record<string, ComponentType<{ className?: string }>> = {
  learn: BookOpen,
  video: Video,
  practice: PenTool,
  revision: RotateCcw,
  coding: Code2,
  reflection: LibraryBig,
}

const connectedTools = [
  {
    href: '/practice',
    label: 'Practice',
    helper: 'Use questions to expose the exact gap.',
    icon: PenTool,
  },
  {
    href: '/revision',
    label: 'Revision',
    helper: 'Review due concepts with spaced repetition.',
    icon: RotateCcw,
  },
  {
    href: '/tutor',
    label: 'Ask LEO',
    helper: 'Open the tutor with your current learning context.',
    icon: BrainCircuit,
  },
  {
    href: '/notebook',
    label: 'Notebook',
    helper: 'Keep mistakes, formulas, doubts and flashcards.',
    icon: LibraryBig,
  },
  {
    href: '/planner',
    label: 'Planner',
    helper: 'Turn unfinished lessons into realistic study blocks.',
    icon: CalendarCheck,
  },
  {
    href: '/coding',
    label: 'Coding Lab',
    helper: 'Practise, run and debug lesson-linked code.',
    icon: Code2,
  },
] as const

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'Learner'
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}h ${rest}m` : `${hours}h`
}

export function LearningOSMobileFirstHome({
  userName,
  programme,
  currentSemester,
  dailyMinutes,
  xp,
  streak,
  revisionDue,
  plannedLessons,
  semesters,
}: LearningOSHomeProps) {
  const today = localDateKey()
  const fallbackProfile: StudentLearningProfile = {
    ...DEFAULT_STUDENT_PROFILE,
    programme,
    semester: currentSemester,
    dailyMinutes,
    weeklyGoalMinutes: dailyMinutes * 5,
  }

  const [profile, setProfile, profileReady] = useLocalState(
    STUDENT_OS_STORAGE.profile,
    fallbackProfile,
  )
  const [missionState, setMissionState] = useLocalState<MissionState>(
    STUDENT_OS_STORAGE.missions,
    { date: today, completed: [] },
  )
  const [focusStats, setFocusStats] = useLocalState<FocusState>(
    STUDENT_OS_STORAGE.focus,
    { completedSessions: 0, totalMinutes: 0 },
  )
  const [semester, setSemester] = useState(currentSemester)
  const [query, setQuery] = useState('')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)

  useEffect(() => {
    if (missionState.date !== today) {
      setMissionState({ date: today, completed: [] })
    }
  }, [missionState.date, setMissionState, today])

  useEffect(() => {
    if (!focusRunning) return
    if (secondsLeft <= 0) {
      setFocusRunning(false)
      setFocusStats((current) => ({
        completedSessions: current.completedSessions + 1,
        totalMinutes: current.totalMinutes + focusMinutes,
      }))
      toast.success('Focus block finished. Take a short break.')
      return
    }

    const timer = window.setTimeout(
      () => setSecondsLeft((current) => Math.max(0, current - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [focusMinutes, focusRunning, secondsLeft, setFocusStats])

  const missions = useMemo(
    () => buildDailyMissions(profile.dailyMinutes, profile.learningMode).slice(0, 4),
    [profile.dailyMinutes, profile.learningMode],
  )
  const completedIds = missionState.date === today ? missionState.completed : []
  const completedCount = missions.filter((mission) => completedIds.includes(mission.id)).length
  const missionProgress = missions.length
    ? Math.round((completedCount / missions.length) * 100)
    : 0
  const activeSemester = semesters.find((item) => item.number === semester) ?? semesters[0]
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSubjects = (activeSemester?.subjects ?? []).filter((subject) => {
    if (!normalizedQuery) return true
    return [subject.code, subject.name, subject.category, subject.coverageFocus]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })
  const activePath = getAdaptivePath(profile.learningMode)
  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  const toggleMission = (missionId: string) => {
    const completed = completedIds.includes(missionId)
    setMissionState({
      date: today,
      completed: completed
        ? completedIds.filter((id) => id !== missionId)
        : [...completedIds, missionId],
    })
  }

  const changeTimer = (minutes: number) => {
    setFocusRunning(false)
    setFocusMinutes(minutes)
    setSecondsLeft(minutes * 60)
  }

  if (!profileReady) {
    return (
      <div className="grid min-h-[42vh] place-items-center px-4 text-center">
        <div>
          <Mascot mascot="leo" state="thinking" size={82} animated={false} />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">
            Preparing your learning route…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="learn-home" className="space-y-5 sm:space-y-6">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card p-4 shadow-sm sm:p-6 lg:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {programme} · Semester {currentSemester} · {activePath.title}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-4xl">
              {firstName(userName)}, continue from the exact lesson you left.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              One connected path for notes, the mapped video, practice, revision, LEO and your notebook.
            </p>

            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
              <Link
                href="/learn/current"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm"
              >
                <Play className="h-4 w-4" /> Continue current lesson
              </Link>
              <Link
                href={`/learn/${programme}/semester/${currentSemester}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold hover:bg-accent"
              >
                <BookOpen className="h-4 w-4" /> Open Semester {currentSemester}
              </Link>
              <Link
                href="/learning-profile"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold hover:bg-accent"
              >
                <Settings2 className="h-4 w-4" /> Personalise
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat icon={Flame} label="Streak" value={`${streak}d`} />
              <MiniStat icon={RotateCcw} label="Due" value={revisionDue} />
              <MiniStat icon={Zap} label="XP" value={xp} />
            </div>
          </div>

          <div className="hidden rounded-2xl border border-border bg-background/70 p-4 text-center lg:block">
            <Mascot mascot={profile.mascot} state="greeting" size={112} animated={false} />
            <p className="mt-1 font-black">LEO</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Finish the smallest useful next step, then move on.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Today</p>
              <h2 className="mt-1 text-xl font-black">A short route with a finish line</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {completedCount}/{missions.length} steps complete · {missionProgress}%
              </p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-primary/20 bg-primary/5 text-sm font-black text-primary">
              {missionProgress}%
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {missions.map((mission, index) => {
              const Icon = missionIcons[mission.category] ?? BookOpen
              const completed = completedIds.includes(mission.id)
              return (
                <article
                  key={mission.id}
                  className={cn(
                    'grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 rounded-2xl border p-3',
                    completed
                      ? 'border-emerald-500/25 bg-emerald-500/5'
                      : 'border-border bg-background',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-xl border',
                      completed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-border text-muted-foreground',
                    )}
                    aria-label={completed ? `Mark ${mission.title} incomplete` : `Mark ${mission.title} complete`}
                  >
                    {completed ? <Check className="h-5 w-5" /> : <span className="text-sm font-black">{index + 1}</span>}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <h3 className={cn('truncate text-sm font-black', completed && 'line-through opacity-65')}>
                        {mission.title}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {mission.description} · {mission.minutes} min
                    </p>
                  </div>
                  <Link
                    href={mission.href}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:bg-accent"
                    aria-label={`Open ${mission.title}`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Focus</p>
              <h2 className="mt-1 text-xl font-black">One task, one timer</h2>
            </div>
            <TimerReset className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-5 text-center font-mono text-5xl font-black tabular-nums">{timerLabel}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[15, 25, 45].map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => changeTimer(minutes)}
                className={cn(
                  'min-h-11 rounded-xl border text-xs font-black',
                  focusMinutes === minutes
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-accent',
                )}
              >
                {minutes} min
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setFocusRunning((current) => !current)}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
            >
              {focusRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {focusRunning ? 'Pause' : 'Start focus'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFocusRunning(false)
                setSecondsLeft(focusMinutes * 60)
              }}
              className="grid h-12 w-12 place-items-center rounded-xl border border-border hover:bg-accent"
              aria-label="Reset focus timer"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <MiniPanel label="Blocks" value={focusStats.completedSessions} />
            <MiniPanel label="Focused" value={minutesLabel(focusStats.totalMinutes)} />
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Subjects</p>
            <h2 className="mt-1 text-xl font-black">Open a subject and follow its lesson order</h2>
          </div>
          <label className="relative block w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search subject or code"
              className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-1.5 sm:gap-2">
          {semesters.map((item) => (
            <button
              key={item.number}
              type="button"
              onClick={() => setSemester(item.number)}
              className={cn(
                'min-h-11 rounded-xl border px-1 text-sm font-black',
                semester === item.number
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-accent',
              )}
              aria-label={`Show semester ${item.number}`}
            >
              S{item.number}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <Link
              key={subject.code}
              href={subject.href}
              className="group rounded-2xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">
                    {subject.code} · {subject.category}
                  </p>
                  <h3 className="mt-1 line-clamp-2 font-black">{subject.name}</h3>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {subject.coverageFocus}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-1">{subject.lessonCount || 0} lessons</span>
                <span className="rounded-full bg-muted px-2 py-1">{subject.videoCount} videos</span>
                <span className="rounded-full bg-muted px-2 py-1">{subject.credits} credits</span>
                <span className={cn(
                  'rounded-full px-2 py-1',
                  subject.hasDetailedNotes
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'bg-amber-500/10 text-amber-700',
                )}>
                  {subject.hasDetailedNotes ? 'Notes ready' : 'Summary only'}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {visibleSubjects.length === 0 && (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <BookOpen className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 font-black">No matching subjects</p>
            <p className="mt-1 text-sm text-muted-foreground">Try the subject name or official code.</p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Connected tools</p>
            <h2 className="mt-1 text-xl font-black">Every page should continue the same learning loop</h2>
          </div>
          <Link href="/student-os" className="hidden text-sm font-bold text-primary hover:underline sm:inline">
            Learning Universe
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {connectedTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-accent/30"
            >
              <tool.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 text-sm font-black">{tool.label}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{tool.helper}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard icon={Clock3} label="Daily goal" value={minutesLabel(profile.dailyMinutes)} />
        <SummaryCard icon={Target} label="Weekly goal" value={minutesLabel(profile.weeklyGoalMinutes)} />
        <SummaryCard icon={CalendarCheck} label="Planned" value={`${plannedLessons} tasks`} />
        <SummaryCard icon={RotateCcw} label="Revision" value={`${revisionDue} due`} />
      </section>

      <div className="sr-only" aria-live="polite">
        Current learning mode: {activePath.title}
      </div>

      <button
        type="button"
        className="sr-only"
        onClick={() => setProfile((current) => ({ ...current, semester }))}
      >
        Save selected semester
      </button>
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/70 p-2.5">
      <div className="flex items-center gap-1.5 text-primary">
        <Icon className="h-3.5 w-3.5" />
        <span className="truncate text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-base font-black tabular-nums">{value}</p>
    </div>
  )
}

function MiniPanel({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="font-black tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  )
}
