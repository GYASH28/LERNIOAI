'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  ChevronRight,
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
  Sparkles,
  Target,
  TimerReset,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { LearningIllustration, type LearningIllustrationVariant } from '@/components/engagement/learning-illustration'
import { Mascot } from '@/components/mascots/mascot'
import { useLocalState } from '@/components/student-os/use-local-state'
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
import { studyCoachLine } from '@/lib/engagement-copy'
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

interface LearningOSHomeClientProps {
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

const MISSION_ICONS: Record<string, LucideIcon> = {
  learn: BookOpen,
  video: Video,
  practice: PenTool,
  revision: RotateCcw,
  coding: Code2,
  reflection: LibraryBig,
}

const QUICK_TOOLS: Array<{
  href: string
  label: string
  helper: string
  icon: LucideIcon
  illustration: LearningIllustrationVariant
}> = [
  { href: '/practice', label: 'Practice', helper: 'Use questions to find the gap.', icon: PenTool, illustration: 'practice' },
  { href: '/revision', label: 'Revision', helper: 'Recall due concepts before they fade.', icon: RotateCcw, illustration: 'revision' },
  { href: '/tutor', label: 'Ask LEO', helper: 'Get another explanation or example.', icon: BrainCircuit, illustration: 'tutor' },
  { href: '/notebook', label: 'Notebook', helper: 'Keep mistakes, formulas and doubts.', icon: LibraryBig, illustration: 'empty' },
]

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 22) return 'Good evening'
  return 'Late-night study mode'
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function subjectIllustration(subject: LearningOSSubjectSummary): LearningIllustrationVariant {
  const text = `${subject.code} ${subject.name} ${subject.coverageFocus}`.toLowerCase()
  if (/code|program|data structure|algorithm|java|python|c\+\+/.test(text)) return 'coding'
  if (/math|logic|digital|network|microprocessor|electronics/.test(text)) return 'practice'
  if (/communication|english|management|project/.test(text)) return 'planner'
  return 'journey'
}

export function LearningOSHomeClient({
  userName,
  programme,
  currentSemester,
  dailyMinutes,
  xp,
  streak,
  revisionDue,
  plannedLessons,
  semesters,
}: LearningOSHomeClientProps) {
  const today = localDateKey()
  const fallbackProfile: StudentLearningProfile = {
    ...DEFAULT_STUDENT_PROFILE,
    programme,
    semester: currentSemester,
    dailyMinutes,
    weeklyGoalMinutes: dailyMinutes * 5,
  }

  const [profile, setProfile, profileReady] = useLocalState(STUDENT_OS_STORAGE.profile, fallbackProfile)
  const [missionState, setMissionState] = useLocalState<MissionState>(STUDENT_OS_STORAGE.missions, { date: today, completed: [] })
  const [focusStats, setFocusStats] = useLocalState<FocusState>(STUDENT_OS_STORAGE.focus, { completedSessions: 0, totalMinutes: 0 })
  const [semesterOverride, setSemesterOverride] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const secondsLeftRef = useRef(25 * 60)
  const semester = semesterOverride ?? currentSemester
  const selectedPath = profile.learningMode

  useEffect(() => {
    if (!focusRunning) return
    const timer = window.setInterval(() => {
      const next = Math.max(0, secondsLeftRef.current - 1)
      secondsLeftRef.current = next
      setSecondsLeft(next)
      if (next > 0) return
      window.clearInterval(timer)
      setFocusRunning(false)
      setFocusStats((current) => ({
        completedSessions: current.completedSessions + 1,
        totalMinutes: current.totalMinutes + focusMinutes,
      }))
      toast.success('Focus block finished. Take a short break before the next step.')
    }, 1000)
    return () => window.clearInterval(timer)
  }, [focusMinutes, focusRunning, setFocusStats])

  const selectedSemester = semesters.find((item) => item.number === semester) ?? semesters[0]
  const normalizedQuery = query.trim().toLowerCase()
  const subjects = useMemo(() => {
    const source = selectedSemester?.subjects ?? []
    if (!normalizedQuery) return source
    return source.filter((subject) =>
      [subject.code, subject.name, subject.category, subject.coverageFocus]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [normalizedQuery, selectedSemester])

  const missions = useMemo(
    () => buildDailyMissions(profile.dailyMinutes, selectedPath).slice(0, 5),
    [profile.dailyMinutes, selectedPath],
  )
  const completedIds = missionState.date === today ? missionState.completed : []
  const completedMissions = missions.filter((mission) => completedIds.includes(mission.id))
  const missionProgress = missions.length ? Math.round((completedMissions.length / missions.length) * 100) : 0
  const nextMission = missions.find((mission) => !completedIds.includes(mission.id)) ?? missions[0]
  const activePath = getAdaptivePath(selectedPath)
  const activeMascot = MASCOT_CATALOG.find((item) => item.key === profile.mascot) ?? MASCOT_CATALOG[0]
  const firstName = userName.split(' ')[0] || 'Learner'
  const coach = studyCoachLine(new Date().getDate() + completedMissions.length)
  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`
  const currentSemesterSummary = semesters.find((item) => item.number === currentSemester)
  const currentSubjectCount = currentSemesterSummary?.subjects.length ?? 0
  const currentLessonCount = currentSemesterSummary?.subjects.reduce((sum, subject) => sum + subject.lessonCount, 0) ?? 0

  const toggleMission = (id: string) => {
    const done = completedIds.includes(id)
    setMissionState({
      date: today,
      completed: done ? completedIds.filter((item) => item !== id) : [...completedIds, id],
    })
    if (!done) toast.success('Step completed. The next useful action is ready.')
  }

  const choosePath = (mode: StudentLearningMode) => {
    setProfile((current) => ({ ...current, learningMode: mode }))
    setMissionState({ date: today, completed: [] })
    toast.success(`${getAdaptivePath(mode).title} is now your study path.`)
  }

  const setTimerLength = (minutes: number) => {
    setFocusRunning(false)
    setFocusMinutes(minutes)
    secondsLeftRef.current = minutes * 60
    setSecondsLeft(minutes * 60)
  }

  if (!profileReady) {
    return (
      <div className="grid min-h-[65vh] place-items-center">
        <div className="w-full max-w-md text-center">
          <LearningIllustration variant="journey" animated className="mx-auto max-w-sm" />
          <p className="mt-3 text-sm font-semibold text-muted-foreground">Building a practical study path…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 space-y-8 pb-12">
      <section className="overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card shadow-sm">
        <div className="grid items-center gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
              <span>{greetingForHour(new Date().getHours())}, {firstName}</span>
              <span className="text-muted-foreground">•</span>
              <span>{programme} · Semester {currentSemester}</span>
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-[-0.04em] sm:text-5xl">
              One useful study move, then the next.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Learnio now keeps lessons, practice, revision and LEO connected to one path instead of presenting a wall of unrelated features.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {nextMission && (
                <Link href={nextMission.href} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition hover:-translate-y-0.5">
                  <Play className="h-4 w-4" /> {missionProgress === 100 ? 'Choose a bonus lesson' : nextMission.title}
                </Link>
              )}
              <Link href={`/learn/${programme}/semester/${currentSemester}`} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background/80 px-5 text-sm font-black hover:bg-accent">
                <BookOpen className="h-4 w-4" /> Browse Semester {currentSemester}
              </Link>
              <Link href="/learning-profile" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 text-sm font-bold hover:bg-accent">
                <Settings2 className="h-4 w-4" /> Personalise
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <CompactStat icon={BookOpen} label="Current subjects" value={currentSubjectCount} />
              <CompactStat icon={Target} label="Structured lessons" value={currentLessonCount || '—'} />
              <CompactStat icon={Flame} label="Study streak" value={`${streak} days`} />
            </div>
          </div>

          <div className="relative min-h-[300px] rounded-[1.75rem] border border-border/80 bg-background/72 p-3 backdrop-blur-sm">
            <LearningIllustration variant={missionProgress === 100 ? 'celebration' : 'journey'} animated={!profile.reducedMotion} className="mx-auto max-w-[340px]" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-border bg-background/90 p-3 shadow-sm backdrop-blur">
              <div className="flex items-center gap-3">
                <Mascot mascot={profile.mascot} state={missionProgress === 100 ? 'achievement' : 'greeting'} size={54} animated={!profile.reducedMotion} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{activeMascot.name}: {coach.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{coach.message}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Today’s route</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">A short path with a visible finish line</h2>
              <p className="mt-1 text-sm text-muted-foreground">Each step has a purpose. Complete it or open it—nothing is hidden behind vague cards.</p>
            </div>
            <ProgressDial progress={missionProgress} label={`${completedMissions.length}/${missions.length}`} />
          </div>

          <div className="mt-5 space-y-3">
            {missions.map((mission, index) => {
              const Icon = MISSION_ICONS[mission.category] ?? BookOpen
              const done = completedIds.includes(mission.id)
              const isNext = nextMission?.id === mission.id
              return (
                <article key={mission.id} className={cn('grid gap-3 rounded-2xl border p-4 transition sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center', done ? 'border-emerald-500/25 bg-emerald-500/5' : isNext ? 'border-primary/35 bg-primary/5' : 'border-border bg-background')}>
                  <button
                    type="button"
                    onClick={() => toggleMission(mission.id)}
                    className={cn('flex h-11 w-11 items-center justify-center rounded-xl border transition', done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary')}
                    aria-label={done ? `Mark ${mission.title} incomplete` : `Mark ${mission.title} complete`}
                  >
                    {done ? <Check className="h-5 w-5" /> : <span className="text-sm font-black">{index + 1}</span>}
                  </button>
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={cn('font-black', done && 'line-through opacity-65')}>{mission.title}</h3>
                        {isNext && !done && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary-foreground">Next</span>}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-muted-foreground">{mission.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {mission.minutes} min</span>
                    <Link href={mission.href} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background hover:bg-accent" aria-label={`Open ${mission.title}`}><ChevronRight className="h-4 w-4" /></Link>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-5 rounded-2xl bg-muted/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">Why this route?</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{activePath.description} It is sized around your {profile.dailyMinutes}-minute daily target.</p>
              </div>
              <select
                value={selectedPath}
                onChange={(event) => choosePath(event.target.value as StudentLearningMode)}
                className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none focus:border-primary"
                aria-label="Select learning path"
              >
                {ADAPTIVE_PATHS.map((path) => <option key={path.id} value={path.id}>{path.title}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Focus room</p>
                <h2 className="mt-1 text-xl font-black">One task. One timer.</h2>
              </div>
              <TimerReset className="h-5 w-5 text-primary" />
            </div>
            <LearningIllustration variant="focus" animated={!profile.reducedMotion} className="mx-auto -my-4 max-w-[250px]" />
            <p className="text-center font-mono text-5xl font-black tabular-nums">{timerLabel}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[15, 25, 45].map((minutes) => (
                <button key={minutes} type="button" onClick={() => setTimerLength(minutes)} className={cn('min-h-11 rounded-xl border text-xs font-black', focusMinutes === minutes ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>{minutes} min</button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setFocusRunning((current) => !current)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground">
                {focusRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{focusRunning ? 'Pause' : 'Start focus'}
              </button>
              <button type="button" onClick={() => { setFocusRunning(false); secondsLeftRef.current = focusMinutes * 60; setSecondsLeft(focusMinutes * 60) }} className="flex h-12 w-12 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Reset focus timer"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/45 p-3"><p className="font-black">{focusStats.completedSessions}</p><p className="text-[11px] text-muted-foreground">completed blocks</p></div>
              <div className="rounded-xl bg-muted/45 p-3"><p className="font-black">{minutesLabel(focusStats.totalMinutes)}</p><p className="text-[11px] text-muted-foreground">focused total</p></div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>
              <div><p className="text-xs font-black uppercase tracking-wide text-primary">Coach note</p><h2 className="font-black">{coach.title}</h2></div>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{coach.message}</p>
            {coach.joke && <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs font-semibold text-foreground/80">{coach.joke}</p>}
          </section>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Semester workspace</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Choose a subject, then follow its lesson order</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">This area is for curriculum navigation. Practice, revision and Tutor remain contextual tools—not separate destinations you must organise yourself.</p>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject, code or topic" className="min-h-12 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary" />
          </label>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {semesters.map((item) => (
            <button key={item.number} type="button" onClick={() => setSemesterOverride(item.number)} className={cn('min-h-16 rounded-xl border px-2 py-2 text-center transition', semester === item.number ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-background hover:border-primary/40 hover:bg-accent')}>
              <span className="block text-[10px] font-black uppercase tracking-wide opacity-70">Semester</span>
              <span className="text-2xl font-black">{item.number}</span>
              <span className="block text-[10px] opacity-70">{item.subjects.length} subjects</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <Link key={subject.code} href={subject.href} className="group overflow-hidden rounded-2xl border border-border bg-background transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
              <div className="grid min-h-36 grid-cols-[minmax(0,1fr)_130px] items-center gap-2 border-b border-border bg-gradient-to-br from-primary/8 to-transparent p-4">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-primary">{subject.code} · {subject.category}</p>
                  <h3 className="mt-2 text-lg font-black leading-tight">{subject.name}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{subject.coverageFocus}</p>
                </div>
                <LearningIllustration variant={subjectIllustration(subject)} animated={!profile.reducedMotion} className="w-[140px] max-w-none -translate-x-1 scale-105" />
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <SubjectMetric value={subject.lessonCount || '—'} label="Lessons" />
                  <SubjectMetric value={subject.videoCount} label="Videos" />
                  <SubjectMetric value={subject.credits} label="Credits" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn('rounded-full px-2 py-1 text-[10px] font-black', subject.hasDetailedNotes ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700')}>{subject.hasDetailedNotes ? 'Detailed notes ready' : 'Summary resources'}</span>
                  {subject.priority.includes('critical') && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-black text-rose-700">High priority</span>}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs font-black text-primary">Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </div>
              </div>
            </Link>
          ))}
          {subjects.length === 0 && (
            <div className="col-span-full rounded-[1.5rem] border border-dashed border-border bg-background p-6 text-center">
              <LearningIllustration variant="empty" animated={!profile.reducedMotion} className="mx-auto max-w-[280px]" />
              <h3 className="mt-2 text-lg font-black">No matching subjects</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try a subject code, name or topic.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Contextual tools</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Use these after the lesson tells you why</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {QUICK_TOOLS.map((tool) => (
              <Link key={tool.href} href={tool.href} className="group grid min-h-40 grid-cols-[minmax(0,1fr)_120px] items-center overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35">
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><tool.icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 font-black">{tool.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{tool.helper}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-black text-primary">Open <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
                </div>
                <LearningIllustration variant={tool.illustration} animated={!profile.reducedMotion} className="w-[135px] max-w-none" />
              </Link>
            ))}
          </div>
        </div>

        <aside className="rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 to-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Weekly balance</p><h2 className="mt-1 text-xl font-black">Enough structure, with breathing room</h2></div>
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <LearningIllustration variant="planner" animated={!profile.reducedMotion} className="mx-auto -my-3 max-w-[280px]" />
          <div className="space-y-3">
            <WeeklyRow icon={Clock3} label="Daily target" value={minutesLabel(profile.dailyMinutes)} />
            <WeeklyRow icon={Target} label="Weekly focused goal" value={minutesLabel(profile.weeklyGoalMinutes)} />
            <WeeklyRow icon={RotateCcw} label="Revision due" value={`${revisionDue} cards`} />
            <WeeklyRow icon={CalendarCheck} label="Planned lessons" value={`${plannedLessons} this week`} />
            <WeeklyRow icon={Zap} label="Account XP" value={`${xp} XP`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/planner" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-primary-foreground"><CalendarCheck className="h-4 w-4" /> Planner</Link>
            <Link href="/learning-profile" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-black hover:bg-accent"><Settings2 className="h-4 w-4" /> Profile</Link>
          </div>
        </aside>
      </section>
    </div>
  )
}

function CompactStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/65 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-primary"><Icon className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</span></div>
      <p className="mt-2 text-lg font-black tabular-nums">{value}</p>
    </div>
  )
}

function ProgressDial({ progress, label }: { progress: number; label: string }) {
  return (
    <div className="relative h-20 w-20 shrink-0 rounded-full p-2" style={{ background: `conic-gradient(hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}% 100%)` }}>
      <div className="grid h-full w-full place-items-center rounded-full bg-card text-center">
        <div><p className="text-lg font-black tabular-nums">{progress}%</p><p className="text-[10px] font-bold text-muted-foreground">{label}</p></div>
      </div>
    </div>
  )
}

function SubjectMetric({ value, label }: { value: number | string; label: string }) {
  return <div className="rounded-xl bg-muted/55 p-2"><p className="font-black tabular-nums">{value}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p></div>
}

function WeeklyRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Icon className="h-4 w-4 text-primary" />{label}</span><strong className="text-sm">{value}</strong></div>
}
