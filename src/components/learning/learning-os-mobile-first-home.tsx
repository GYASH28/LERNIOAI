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
import { useLocalState } from '@/components/student-os/use-local-state'
import {
  DEFAULT_STUDENT_PROFILE,
  STUDENT_OS_STORAGE,
  buildDailyMissions,
  getAdaptivePath,
  type StudentLearningMode,
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
  videoLessonCount: number
  pendingVideoCount: number
  noteTopicCount: number
  notesReady: boolean
  href: string
  firstVideoHref: string | null
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

const VALID_LEARNING_MODES = new Set<StudentLearningMode>([
  'complete',
  'fast-track',
  'exam-crash',
  'weak-topic',
  'weekend-catch-up',
  'revision-only',
  'coding-practice',
  'low-bandwidth',
])

const missionIcons: Record<string, ComponentType<{ className?: string }>> = {
  learn: Video,
  video: Video,
  practice: PenTool,
  revision: RotateCcw,
  coding: BrainCircuit,
  reflection: LibraryBig,
}

const connectedTools = [
  { href: '/materials', label: 'Materials', helper: 'Read the complete written notes separately.', icon: BookOpen },
  { href: '/tutor', label: 'Ask LEO', helper: 'Continue with subject and lesson context attached.', icon: BrainCircuit },
  { href: '/practice', label: 'Practice', helper: 'Turn watched lessons into active recall.', icon: PenTool },
  { href: '/revision', label: 'Revision', helper: 'Review due concepts with spaced repetition.', icon: RotateCcw },
  { href: '/notebook', label: 'Notebook', helper: 'Save mistakes, formulas and doubts.', icon: LibraryBig },
  { href: '/planner', label: 'Planner', helper: 'Schedule realistic video and practice blocks.', icon: CalendarCheck },
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

function clamp(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function sanitizeProfile(value: StudentLearningProfile, fallback: StudentLearningProfile) {
  return {
    ...fallback,
    ...value,
    programme: value?.programme === 'DCIOT' ? 'DCIOT' : fallback.programme,
    semester: Math.round(clamp(value?.semester, fallback.semester, 1, 6)),
    dailyMinutes: Math.round(clamp(value?.dailyMinutes, fallback.dailyMinutes, 10, 600)),
    weeklyGoalMinutes: Math.round(clamp(value?.weeklyGoalMinutes, fallback.weeklyGoalMinutes, 30, 3600)),
    learningMode: VALID_LEARNING_MODES.has(value?.learningMode) ? value.learningMode : fallback.learningMode,
    completed: undefined,
  } as StudentLearningProfile
}

function sanitizeMissions(value: MissionState, today: string): MissionState {
  return {
    date: typeof value?.date === 'string' ? value.date : today,
    completed: Array.isArray(value?.completed)
      ? value.completed.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

function sanitizeFocus(value: FocusState): FocusState {
  return {
    completedSessions: Math.round(clamp(value?.completedSessions, 0, 0, 100000)),
    totalMinutes: Math.round(clamp(value?.totalMinutes, 0, 0, 10000000)),
  }
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
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
  const fallbackProfile = useMemo<StudentLearningProfile>(() => ({
    ...DEFAULT_STUDENT_PROFILE,
    programme,
    semester: currentSemester,
    dailyMinutes,
    weeklyGoalMinutes: dailyMinutes * 5,
  }), [currentSemester, dailyMinutes, programme])

  const [storedProfile, , profileReady] = useLocalState(STUDENT_OS_STORAGE.profile, fallbackProfile)
  const [storedMissions, setStoredMissions] = useLocalState<MissionState>(
    STUDENT_OS_STORAGE.missions,
    { date: today, completed: [] },
  )
  const [storedFocus, setStoredFocus] = useLocalState<FocusState>(
    STUDENT_OS_STORAGE.focus,
    { completedSessions: 0, totalMinutes: 0 },
  )

  const profile = useMemo(
    () => sanitizeProfile(storedProfile, fallbackProfile),
    [fallbackProfile, storedProfile],
  )
  const missionState = useMemo(
    () => sanitizeMissions(storedMissions, today),
    [storedMissions, today],
  )
  const focusStats = useMemo(() => sanitizeFocus(storedFocus), [storedFocus])

  const [semester, setSemester] = useState(currentSemester)
  const [query, setQuery] = useState('')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)

  useEffect(() => {
    if (missionState.date !== today) setStoredMissions({ date: today, completed: [] })
  }, [missionState.date, setStoredMissions, today])

  useEffect(() => {
    if (!focusRunning) return
    if (secondsLeft <= 0) {
      setFocusRunning(false)
      setStoredFocus((current) => {
        const safe = sanitizeFocus(current)
        return {
          completedSessions: safe.completedSessions + 1,
          totalMinutes: safe.totalMinutes + focusMinutes,
        }
      })
      toast.success('Focus block finished. Take a short break.')
      return
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((current) => Math.max(0, current - 1)),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [focusMinutes, focusRunning, secondsLeft, setStoredFocus])

  const missions = useMemo(
    () => buildDailyMissions(profile.dailyMinutes, profile.learningMode).slice(0, 4),
    [profile.dailyMinutes, profile.learningMode],
  )
  const completedIds = missionState.date === today ? missionState.completed : []
  const completedCount = missions.filter((mission) => completedIds.includes(mission.id)).length
  const missionProgress = missions.length ? Math.round((completedCount / missions.length) * 100) : 0
  const activeSemester = semesters.find((item) => item.number === semester)
    ?? semesters[0]
    ?? { number: semester, subjects: [] }
  const normalizedQuery = query.trim().toLowerCase()
  const visibleSubjects = activeSemester.subjects.filter((subject) => {
    if (!normalizedQuery) return true
    return [subject.code, subject.name, subject.category, subject.coverageFocus]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  })
  const nextVideo = activeSemester.subjects.find((subject) => subject.firstVideoHref)
  const activePath = getAdaptivePath(profile.learningMode)
  const mappedVideoLessons = activeSemester.subjects.reduce((sum, subject) => sum + subject.videoLessonCount, 0)
  const pendingVideos = activeSemester.subjects.reduce((sum, subject) => sum + subject.pendingVideoCount, 0)
  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  const toggleMission = (missionId: string) => {
    const completed = completedIds.includes(missionId)
    setStoredMissions({
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
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Preparing your video learning route…</p>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="learn-home" className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-card shadow-sm">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center lg:p-8">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {programme} · Semester {currentSemester} · Video learning
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.035em] sm:text-4xl">
              {firstName(userName)}, watch the lesson—then prove you understood it.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Learn contains lesson-specific videos. Complete written notes stay in Materials, so neither section overwrites or imitates the other.
            </p>

            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
              <Link
                href={nextVideo?.firstVideoHref || `/learn/${programme}/semester/${currentSemester}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm"
              >
                <Play className="h-4 w-4" /> {nextVideo ? 'Watch a video lesson' : 'Open current semester'}
              </Link>
              <Link href="/materials" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold hover:bg-accent">
                <BookOpen className="h-4 w-4" /> Read detailed notes
              </Link>
              <Link href="/learning-profile" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold hover:bg-accent">
                <Settings2 className="h-4 w-4" /> Personalise route
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <MiniStat icon={Video} label="Video lessons" value={mappedVideoLessons} />
              <MiniStat icon={Flame} label="Streak" value={`${streak}d`} />
              <MiniStat icon={Zap} label="XP" value={xp} />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/75 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Coverage</p>
                <p className="mt-1 text-lg font-black">Semester {semester}</p>
              </div>
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniPanel label="Mapped videos" value={mappedVideoLessons} />
              <MiniPanel label="Need mapping" value={pendingVideos} />
              <MiniPanel label="Revision due" value={revisionDue} />
              <MiniPanel label="Planned tasks" value={plannedLessons} />
            </div>
            {pendingVideos > 0 ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Missing videos remain clearly marked. Lernio will not duplicate a random playlist just to fill the count.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Video lessons</p>
            <h2 className="mt-1 text-xl font-black">Choose a subject, then watch in order</h2>
            <p className="mt-1 text-sm text-muted-foreground">The lesson count means playable mapped videos—not written note topics.</p>
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

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <article key={subject.code} className="flex min-h-64 flex-col rounded-2xl border border-border bg-background p-4 transition hover:border-primary/35 hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">{subject.code} · {subject.category}</p>
                  <h3 className="mt-1 line-clamp-2 font-black">{subject.name}</h3>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{subject.credits} credits</span>
              </div>
              <p className="mt-3 line-clamp-3 text-xs leading-5 text-muted-foreground">{subject.coverageFocus}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniPanel label="Videos" value={subject.videoLessonCount} />
                <MiniPanel label="Pending" value={subject.pendingVideoCount} />
                <MiniPanel label="Note topics" value={subject.noteTopicCount} />
              </div>

              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <Link href={subject.href} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-border px-3 text-xs font-bold hover:bg-accent">
                  View subject <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {subject.firstVideoHref ? (
                  <Link href={subject.firstVideoHref} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground">
                    <Play className="h-3.5 w-3.5" /> Watch
                  </Link>
                ) : (
                  <span className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-muted px-3 text-center text-[11px] font-bold text-muted-foreground">Videos pending</span>
                )}
              </div>

              <Link href={`/materials?subject=${encodeURIComponent(subject.code)}`} className="mt-2 text-center text-xs font-semibold text-primary hover:underline">
                {subject.notesReady ? 'Open complete written notes' : 'Open available materials'}
              </Link>
            </article>
          ))}
        </div>

        {visibleSubjects.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center">
            <Video className="mx-auto h-7 w-7 text-muted-foreground" />
            <p className="mt-2 font-black">No matching subjects</p>
            <p className="mt-1 text-sm text-muted-foreground">Try the official code or subject name.</p>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Today</p>
              <h2 className="mt-1 text-xl font-black">Watch → recall → practise → revise</h2>
              <p className="mt-1 text-sm text-muted-foreground">{activePath.title} · {completedCount}/{missions.length} steps complete</p>
            </div>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-primary/20 bg-primary/5 text-sm font-black text-primary">{missionProgress}%</div>
          </div>

          <div className="mt-4 space-y-2">
            {missions.map((mission, index) => {
              const Icon = missionIcons[mission.category] ?? Video
              const completed = completedIds.includes(mission.id)
              return (
                <article key={mission.id} className={cn('grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3 rounded-2xl border p-3', completed ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border bg-background')}>
                  <button
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    className={cn('grid h-11 w-11 place-items-center rounded-xl border', completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border text-muted-foreground')}
                    aria-label={completed ? `Mark ${mission.title} incomplete` : `Mark ${mission.title} complete`}
                  >
                    {completed ? <Check className="h-5 w-5" /> : <span className="text-sm font-black">{index + 1}</span>}
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 shrink-0 text-primary" /><h3 className={cn('truncate text-sm font-black', completed && 'line-through opacity-65')}>{mission.title}</h3></div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{mission.description} · {mission.minutes} min</p>
                  </div>
                  <Link href={mission.href} className="grid h-11 w-11 place-items-center rounded-xl border border-border hover:bg-accent" aria-label={`Open ${mission.title}`}><ArrowRight className="h-4 w-4" /></Link>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Focus</p><h2 className="mt-1 text-xl font-black">One video, no distractions</h2></div>
            <TimerReset className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-5 text-center font-mono text-5xl font-black tabular-nums">{timerLabel}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[15, 25, 45].map((minutes) => (
              <button key={minutes} type="button" onClick={() => changeTimer(minutes)} className={cn('min-h-11 rounded-xl border text-xs font-black', focusMinutes === minutes ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>{minutes} min</button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setFocusRunning((current) => !current)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">
              {focusRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{focusRunning ? 'Pause' : 'Start focus'}
            </button>
            <button type="button" onClick={() => { setFocusRunning(false); setSecondsLeft(focusMinutes * 60) }} className="grid h-12 w-12 place-items-center rounded-xl border border-border hover:bg-accent" aria-label="Reset focus timer"><RotateCcw className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <MiniPanel label="Blocks" value={focusStats.completedSessions} />
            <MiniPanel label="Focused" value={minutesLabel(focusStats.totalMinutes)} />
          </div>
        </aside>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Connected learning</p>
          <h2 className="mt-1 text-xl font-black">Continue the same lesson everywhere</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {connectedTools.map((tool) => (
            <Link key={tool.href} href={tool.href} className="rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40 hover:bg-accent/30">
              <tool.icon className="h-5 w-5 text-primary" /><h3 className="mt-3 text-sm font-black">{tool.label}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{tool.helper}</p>
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
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string | number }) {
  return <div className="rounded-xl border border-border/80 bg-background/70 p-2.5"><div className="flex items-center gap-1.5 text-primary"><Icon className="h-3.5 w-3.5" /><span className="truncate text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</span></div><p className="mt-1 text-base font-black tabular-nums">{value}</p></div>
}

function MiniPanel({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl bg-muted/50 p-3"><p className="font-black tabular-nums">{value}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p></div>
}

function SummaryCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 font-black">{value}</p></div>
}
