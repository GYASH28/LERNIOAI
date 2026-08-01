'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileText,
  Flame,
  Gamepad2,
  GraduationCap,
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

const TOOL_LINKS: Array<{ href: string; label: string; description: string; icon: LucideIcon }> = [
  { href: '/materials', label: 'Detailed Notes', description: 'Lesson-wise digital textbooks', icon: FileText },
  { href: '/practice', label: 'Practice', description: 'Questions linked to what you learn', icon: PenTool },
  { href: '/revision', label: 'Revision', description: 'Flashcards and active recall', icon: RotateCcw },
  { href: '/tutor', label: 'Ask LEO', description: 'Context-aware explanations', icon: BrainCircuit },
  { href: '/games', label: 'Game Lab', description: 'Curriculum-connected challenges', icon: Gamepad2 },
  { href: '/notebook', label: 'Notebook', description: 'Notes, mistakes and formulas', icon: LibraryBig },
  { href: '/coding', label: 'Coding Lab', description: 'Predict, run and debug', icon: Code2 },
  { href: '/planner', label: 'Planner', description: 'Build a realistic study plan', icon: CalendarCheck },
]

const MISSION_ICONS: Record<string, LucideIcon> = {
  learn: BookOpen,
  video: Video,
  practice: PenTool,
  revision: RotateCcw,
  coding: Code2,
  reflection: LibraryBig,
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
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
  const [semester, setSemester] = useState(currentSemester)
  const [query, setQuery] = useState('')
  const [selectedPath, setSelectedPath] = useState<StudentLearningMode>(profile.learningMode)
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [focusRunning, setFocusRunning] = useState(false)
  const [showAllPaths, setShowAllPaths] = useState(false)

  useEffect(() => setSelectedPath(profile.learningMode), [profile.learningMode])
  useEffect(() => {
    if (missionState.date !== today) setMissionState({ date: today, completed: [] })
  }, [missionState.date, setMissionState, today])

  useEffect(() => {
    if (!focusRunning) return
    if (secondsLeft <= 0) {
      setFocusRunning(false)
      setFocusStats((current) => ({
        completedSessions: current.completedSessions + 1,
        totalMinutes: current.totalMinutes + focusMinutes,
      }))
      toast.success('Focus session complete. Take a short break before continuing.')
      return
    }
    const timer = window.setInterval(() => setSecondsLeft((current) => current - 1), 1000)
    return () => window.clearInterval(timer)
  }, [focusMinutes, focusRunning, secondsLeft, setFocusStats])

  const selectedSemester = semesters.find((item) => item.number === semester) ?? semesters[0]
  const subjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return selectedSemester?.subjects ?? []
    return (selectedSemester?.subjects ?? []).filter((subject) =>
      [subject.code, subject.name, subject.category, subject.coverageFocus]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [query, selectedSemester])

  const missions = useMemo(() => buildDailyMissions(profile.dailyMinutes, selectedPath), [profile.dailyMinutes, selectedPath])
  const completedIds = missionState.date === today ? missionState.completed : []
  const completedMissions = missions.filter((mission) => completedIds.includes(mission.id))
  const completedMinutes = completedMissions.reduce((sum, mission) => sum + mission.minutes, 0)
  const plannedMinutes = missions.reduce((sum, mission) => sum + mission.minutes, 0)
  const missionProgress = missions.length ? Math.round((completedMissions.length / missions.length) * 100) : 0
  const activePath = getAdaptivePath(selectedPath)
  const activeMascot = MASCOT_CATALOG.find((item) => item.key === profile.mascot) ?? MASCOT_CATALOG[0]
  const nextMission = missions.find((mission) => !completedIds.includes(mission.id)) ?? missions[0]
  const firstName = userName.split(' ')[0] || 'Learner'
  const timerLabel = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`

  const toggleMission = (id: string) => {
    const done = completedIds.includes(id)
    setMissionState({
      date: today,
      completed: done ? completedIds.filter((item) => item !== id) : [...completedIds, id],
    })
    if (!done) toast.success('Mission completed. Your learning plan was updated.')
  }

  const choosePath = (mode: StudentLearningMode) => {
    setSelectedPath(mode)
    setProfile((current) => ({ ...current, learningMode: mode }))
    setMissionState({ date: today, completed: [] })
    toast.success(`${getAdaptivePath(mode).title} activated.`)
  }

  const setTimerLength = (minutes: number) => {
    setFocusRunning(false)
    setFocusMinutes(minutes)
    setSecondsLeft(minutes * 60)
  }

  if (!profileReady) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-center">
        <div>
          <Mascot mascot="leo" state="thinking" size={96} />
          <p className="mt-3 text-sm text-muted-foreground">Preparing your Learning OS…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 pb-10">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-violet-500/5 to-background p-5 sm:p-7">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <span>{programme}</span><span>•</span><span>Semester {currentSemester}</span><span>•</span><span>{activePath.title}</span>
            </div>
            <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
              Learnio Learning OS
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              One reliable place to learn a lesson, watch its exact video, read notes, practise, revise, ask LEO and continue from where you stopped.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={nextMission.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm">
                <Play className="h-4 w-4" /> {missionProgress === 100 ? 'Choose bonus study' : nextMission.title}
              </Link>
              <Link href={`/learn/${programme}/semester/${currentSemester}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/75 px-4 py-2.5 text-sm font-bold hover:bg-accent">
                <GraduationCap className="h-4 w-4" /> Open Semester {currentSemester}
              </Link>
              <Link href="/learning-profile" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/75 px-4 py-2.5 text-sm font-bold hover:bg-accent">
                <Settings2 className="h-4 w-4" /> Personalise
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-border bg-background/75 p-5 text-center shadow-sm backdrop-blur">
            <Mascot mascot={profile.mascot} state={missionProgress === 100 ? 'achievement' : focusRunning ? 'thinking' : 'greeting'} size={122} animated={!profile.reducedMotion} />
            <p className="mt-2 text-lg font-black">{activeMascot.name}</p>
            <p className="text-xs font-bold text-primary">{activeMascot.specialty}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{activeMascot.greeting}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat icon={BookOpen} label="Subjects" value={String(semesters.find((item) => item.number === currentSemester)?.subjects.length ?? 0)} note="current semester" />
        <Stat icon={CheckCircle2} label="Today" value={`${completedMissions.length}/${missions.length}`} note="missions" />
        <Stat icon={Clock3} label="Study" value={minutesLabel(completedMinutes)} note={`${minutesLabel(plannedMinutes)} planned`} />
        <Stat icon={RotateCcw} label="Revision" value={String(revisionDue)} note="due cards" />
        <Stat icon={Zap} label="XP" value={String(xp)} note="server-confirmed" />
        <Stat icon={Flame} label="Streak" value={`${streak}d`} note={`${plannedLessons} planned`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Today’s path</p>
              <h2 className="mt-1 text-2xl font-black">Finish useful work, not random browsing</h2>
              <p className="mt-1 text-sm text-muted-foreground">Missions adjust to your time and selected study mode.</p>
            </div>
            <div className="min-w-44">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{missionProgress}%</span><span>{minutesLabel(completedMinutes)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${missionProgress}%` }} /></div>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {missions.map((mission, index) => {
              const Icon = MISSION_ICONS[mission.category] ?? BookOpen
              const done = completedIds.includes(mission.id)
              return (
                <div key={mission.id} className={cn('flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center', done ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-background')}>
                  <button type="button" onClick={() => toggleMission(mission.id)} className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border', done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border text-muted-foreground hover:border-primary hover:text-primary')} aria-label={done ? `Mark ${mission.title} incomplete` : `Mark ${mission.title} complete`}>
                    {done ? <Check className="h-5 w-5" /> : <span className="text-xs font-black">{index + 1}</span>}
                  </button>
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                    <div><p className={cn('font-bold', done && 'line-through opacity-70')}>{mission.title}</p><p className="mt-1 text-sm leading-5 text-muted-foreground">{mission.description}</p></div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs font-semibold text-muted-foreground">{mission.minutes} min</span>
                    <Link href={mission.href} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label={`Open ${mission.title}`}><ChevronRight className="h-4 w-4" /></Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Focus mode</p><h2 className="mt-1 text-xl font-black">One task at a time</h2></div><TimerReset className="h-5 w-5 text-primary" /></div>
            <p className="my-6 text-center font-mono text-5xl font-black tabular-nums">{timerLabel}</p>
            <div className="mb-4 grid grid-cols-3 gap-2">{[15, 25, 45].map((minutes) => <button key={minutes} type="button" onClick={() => setTimerLength(minutes)} className={cn('min-h-10 rounded-xl border text-xs font-bold', focusMinutes === minutes ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent')}>{minutes} min</button>)}</div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setFocusRunning((current) => !current)} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">{focusRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{focusRunning ? 'Pause' : 'Start focus'}</button>
              <button type="button" onClick={() => { setFocusRunning(false); setSecondsLeft(focusMinutes * 60) }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Reset timer"><RotateCcw className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-muted/50 p-3"><p className="font-black">{focusStats.completedSessions}</p><p className="text-[11px] text-muted-foreground">sessions</p></div><div className="rounded-xl bg-muted/50 p-3"><p className="font-black">{minutesLabel(focusStats.totalMinutes)}</p><p className="text-[11px] text-muted-foreground">focused</p></div></div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="font-black">Learning mode</h2><Sparkles className="h-4 w-4 text-primary" /></div>
            <button type="button" onClick={() => setShowAllPaths((current) => !current)} className="mt-3 w-full rounded-2xl border border-primary/25 bg-primary/5 p-4 text-left">
              <p className="font-bold">{activePath.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{activePath.description}</p>
            </button>
            {showAllPaths && <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{ADAPTIVE_PATHS.map((path) => <button key={path.id} type="button" onClick={() => { choosePath(path.id); setShowAllPaths(false) }} className={cn('w-full rounded-xl border p-3 text-left', selectedPath === path.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')}><p className="text-sm font-bold">{path.title}</p><p className="mt-1 text-xs text-muted-foreground">{path.cadence}</p></button>)}</div>}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Curriculum</p><h2 className="mt-1 text-2xl font-black">All six semesters, lesson by lesson</h2><p className="mt-1 text-sm text-muted-foreground">Choose a semester, then open a subject to follow its units and specific lesson pages.</p></div>
          <label className="relative block w-full lg:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject or topic" className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary" /></label>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {semesters.map((item) => <button key={item.number} type="button" onClick={() => setSemester(item.number)} className={cn('min-h-14 rounded-xl border px-2 py-2 text-center', semester === item.number ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:border-primary/40')}><span className="block text-[10px] font-bold uppercase opacity-70">Semester</span><span className="text-xl font-black">{item.number}</span></button>)}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => <Link key={subject.code} href={subject.href} className="group rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">{subject.code} · {subject.category}</p><h3 className="mt-1 text-lg font-black leading-tight">{subject.name}</h3></div><ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">{subject.coverageFocus}</p><div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><SubjectMetric value={subject.lessonCount || '—'} label="Lessons" /><SubjectMetric value={subject.videoCount} label="Videos" /><SubjectMetric value={subject.credits} label="Credits" /></div><div className="mt-3 flex flex-wrap gap-2"><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', subject.hasDetailedNotes ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>{subject.hasDetailedNotes ? 'Detailed notes' : 'Summary resources'}</span>{subject.priority.includes('critical') && <span className="rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-600">High priority</span>}</div></Link>)}
          {subjects.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center"><Search className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 font-bold">No matching subjects</p><p className="mt-1 text-sm text-muted-foreground">Try a subject code, name or topic.</p></div>}
        </div>
        <Link href={`/learn/${programme}/semester/${semester}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent">Open complete Semester {semester} view <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <section>
        <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Connected learning tools</p><h2 className="mt-1 text-2xl font-black">Everything supports the same lesson</h2></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{TOOL_LINKS.map((tool) => <Link key={tool.href} href={tool.href} className="group rounded-2xl border border-border bg-card p-4 hover:-translate-y-0.5 hover:border-primary/30"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><tool.icon className="h-5 w-5" /></span><p className="mt-3 font-black">{tool.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{tool.description}</p><span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Open <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" /></span></Link>)}</div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Your guides</p><h2 className="mt-1 text-xl font-black">Choose help for the subject</h2></div><Target className="h-5 w-5 text-primary" /></div><div className="mt-4 grid grid-cols-5 gap-2">{MASCOT_CATALOG.map((mascot) => <button key={mascot.key} type="button" onClick={() => setProfile((current) => ({ ...current, mascot: mascot.key }))} className={cn('rounded-2xl border p-2', profile.mascot === mascot.key ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')} title={`${mascot.name}: ${mascot.specialty}`}><Mascot mascot={mascot.key} state={profile.mascot === mascot.key ? 'greeting' : 'idle'} size={54} animated={!profile.reducedMotion} /><span className="mt-1 block text-[10px] font-black">{mascot.name}</span></button>)}</div></div>
        <Link href="/learning-profile" className="group rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-5 sm:p-6"><Settings2 className="h-6 w-6 text-primary" /><h2 className="mt-3 text-xl font-black">Learning profile</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Control language, study style, daily time, low-data mode, motion and your default learning path.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Personalise Learnio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
      </section>
    </div>
  )
}

function Stat({ icon: Icon, label, value, note }: { icon: LucideIcon; label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-3 text-2xl font-black tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>
}

function SubjectMetric({ value, label }: { value: number | string; label: string }) {
  return <div className="rounded-xl bg-muted/60 p-2"><p className="font-black tabular-nums">{value}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p></div>
}
