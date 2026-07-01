'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { usePrefs } from '@/components/theme-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Sparkles,
  Play,
  PenTool,
  RotateCw,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  GraduationCap,
  Star,
  Check,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Award,
  ChevronDown,
  Clock,
  Quote,
  Code2,
  ListChecks,
  CheckCircle2,
  Layers,
  GitCompare,
  Zap,
} from 'lucide-react'
import type {
  Subject,
  Unit,
  Topic,
  Lesson,
  LearningMode,
  MascotKey,
} from '@/lib/types'
import { LEARNING_MODES } from '@/lib/types'

// ---------------------------------------------------------------------------
// Parsed content shapes (mirror scripts/seed.ts)
// ---------------------------------------------------------------------------
interface LearnContent {
  definition: string
  purpose: string
  prerequisites: string[]
  coreConcepts: { title: string; explanation: string }[]
  stepByStep: string[]
  examples: { title: string; content: string }[]
  commonErrors: string[]
  examPoints: string[]
  summary: string
}

interface SimplifyContent {
  simpleEnglish: string
  hinglish: string
  analogy: string
  fiveMinute: string
  oneMinuteRecap: string
  examFormat: string
}

interface VisualiseContent {
  type: 'animation' | 'diagram' | 'interactive'
  description: string
  steps: string[]
  reducedMotionAlt: string
}

interface PractiseContent {
  guidedExamples: { question: string; solution: string }[]
  easyQuestions: string[]
  mediumQuestions: string[]
  hardQuestions: string[]
  hints: string[]
}

interface ReviseContent {
  shortNotes: string[]
  definitions: { term: string; definition: string }[]
  formulas: { name: string; formula: string; use: string }[]
  flashcards: { front: string; back: string }[]
  commonConfusions: { a: string; b: string; difference: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safeParse<T>(s: string | null | undefined): T | null {
  if (!s) return null
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

const MASCOT_MESSAGES: Record<LearningMode, string> = {
  learn: "Let's understand {topic} step by step.",
  simplify: "Here's a simpler way to think about it.",
  visualise: 'Watch how this works visually.',
  practise: "Time to try some questions. You've got this!",
  revise: 'Quick revision to lock it in.',
}

const MODE_ICONS: Record<LearningMode, typeof BookOpen> = {
  learn: BookOpen,
  simplify: Sparkles,
  visualise: Play,
  practise: PenTool,
  revise: RotateCw,
}

const MODE_LABELS: Record<LearningMode, string> = {
  learn: 'Learn',
  simplify: 'Simplify',
  visualise: 'Visualise',
  practise: 'Practise',
  revise: 'Revise',
}

const DIFFICULTY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  easy: 'secondary',
  medium: 'default',
  hard: 'destructive',
}

function findLessonForTopic(subject: Subject | undefined, topicId: string | null): Lesson | null {
  if (!subject || !topicId) return null
  for (const unit of subject.units) {
    // Topic.lessons
    const topic = unit.topics.find((t) => t.id === topicId)
    if (topic?.lessons && topic.lessons.length > 0) {
      return [...topic.lessons].sort((a, b) => a.order - b.order)[0]
    }
    // Unit.lessons fallback — match by topic relation if available
    if (unit.lessons && unit.lessons.length > 0) {
      const linked = unit.lessons.find((l) => (l as unknown as { topicId?: string }).topicId === topicId)
      if (linked) return linked
    }
  }
  return null
}

function findUnitForTopic(subject: Subject | undefined, topicId: string | null): Unit | null {
  if (!subject || !topicId) return null
  for (const unit of subject.units) {
    if (unit.topics.some((t) => t.id === topicId)) return unit
  }
  return null
}

function findTopicById(subject: Subject | undefined, topicId: string | null): Topic | null {
  if (!subject || !topicId) return null
  for (const unit of subject.units) {
    const t = unit.topics.find((tp) => tp.id === topicId)
    if (t) return t
  }
  return null
}

function findLessonById(subject: Subject | undefined, lessonId: string | null): Lesson | null {
  if (!subject || !lessonId) return null
  for (const unit of subject.units) {
    if (unit.lessons) {
      const l = unit.lessons.find((ls) => ls.id === lessonId)
      if (l) return l
    }
    for (const topic of unit.topics) {
      if (topic.lessons) {
        const l = topic.lessons.find((ls) => ls.id === lessonId)
        if (l) return l
      }
    }
  }
  return null
}

function subjectProgress(subject: Subject | undefined, completions: LessonCompletion[]): number {
  if (!subject) return 0
  const all: Lesson[] = []
  subject.units.forEach((u) => {
    if (u.lessons) all.push(...u.lessons)
    u.topics.forEach((t) => {
      if (t.lessons) all.push(...t.lessons)
    })
  })
  if (all.length === 0) return 0
  const completedIds = new Set(
    completions.filter((c) => c.completedAt).map((c) => c.lessonId)
  )
  const done = all.filter((l) => completedIds.has(l.id)).length
  return Math.round((done / all.length) * 100)
}

interface LessonCompletion {
  id?: string
  lessonId: string
  mode: string
  progress: number
  scrollPos?: number
  completedAt?: string | null
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export function LearnView() {
  const {
    subjects,
    currentSubjectId,
    currentUnitNumber,
    currentTopicId,
    currentLessonId,
    currentMode,
    setLearnContext,
    saveContinueLearning,
    setMascot,
    pushMascotToast,
    addXp,
  } = useAppStore()

  const subject = useMemo(
    () => subjects.find((s) => s.id === currentSubjectId) || null,
    [subjects, currentSubjectId]
  )

  // Stage 1: subject selection
  if (!subject) {
    return <SubjectGrid />
  }

  // Stage 2: unit/topic browser (subject chosen but no topic)
  if (!currentTopicId) {
    return <UnitTopicBrowser subject={subject} />
  }

  // Stage 3: lesson view with 5 modes
  return (
    <LessonView
      subject={subject}
      topicId={currentTopicId}
      lessonId={currentLessonId}
      mode={currentMode}
      setLearnContext={setLearnContext}
      saveContinueLearning={saveContinueLearning}
      setMascot={setMascot}
      pushMascotToast={pushMascotToast}
      addXp={addXp}
    />
  )
}

// ---------------------------------------------------------------------------
// Stage 1: Subject grid
// ---------------------------------------------------------------------------
function SubjectGrid() {
  const { subjects, setLearnContext, setView, setMascot } = useAppStore()
  const [completions, setCompletions] = useState<LessonCompletion[]>([])

  useEffect(() => {
    fetch('/api/progress/lesson')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCompletions(d.data || [])
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5"
      >
        <Mascot mascot="leo" state="greeting" size={56} />
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Pick a subject to learn</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Each subject has its own guide — Byte for Data Structures, Coda for C++,
            Pico for Microprocessors and Nova for Data Communication. Choose your
            adventure.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject, idx) => {
          const pct = subjectProgress(subject, completions)
          const mascot = (subject.mascotKey || 'leo') as MascotKey
          return (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group h-full"
                onClick={() => {
                  setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })
                  setMascot(mascot, 'greeting', `Welcome to ${subject.shortName || subject.name}! I'm your guide.`)
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="h-14 w-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${subject.accentColor}1a` }}
                    >
                      <Mascot mascot={mascot} state="idle" size={48} animated={false} />
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-meta">{subject.code}</Badge>
                      <p className="text-meta text-muted-foreground mt-1">{subject.credits} credits</p>
                    </div>
                  </div>
                  <h3 className="font-semibold leading-tight">{subject.name}</h3>
                  {subject.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[2rem]">
                      {subject.description}
                    </p>
                  )}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-meta text-muted-foreground">
                      <span>Lessons completed</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1.5"
                      style={{ '--progress-color': subject.accentColor } as React.CSSProperties}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-end text-xs font-medium" style={{ color: subject.accentColor }}>
                    Browse units <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        {subjects.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Mascot mascot="leo" state="rest" size={64} className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">
                No subjects available yet. Ask your admin to seed the academic scheme.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage 2: Unit/Topic browser
// ---------------------------------------------------------------------------
function UnitTopicBrowser({ subject }: { subject: Subject }) {
  const { setLearnContext, setMascot, saveContinueLearning, continueLearning } = useAppStore()
  const [completions, setCompletions] = useState<LessonCompletion[]>([])
  const [openUnits, setOpenUnits] = useState<string[]>(() => {
    if (continueLearning?.subjectId === subject.id && continueLearning.unitNumber != null) {
      const u = subject.units.find((un) => un.number === continueLearning.unitNumber)
      if (u) return [u.id]
    }
    return subject.units[0] ? [subject.units[0].id] : []
  })

  useEffect(() => {
    fetch('/api/progress/lesson')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCompletions(d.data || [])
      })
      .catch(() => {})
  }, [])

  const mascot = (subject.mascotKey || 'leo') as MascotKey
  const completedIds = useMemo(
    () => new Set(completions.filter((c) => c.completedAt).map((c) => c.lessonId)),
    [completions]
  )

  const handleTopicClick = (unit: Unit, topic: Topic) => {
    const lesson = topic.lessons?.[0]
    setLearnContext({
      subjectId: subject.id,
      unitNumber: unit.number,
      topicId: topic.id,
      lessonId: lesson?.id || null,
      mode: 'learn',
    })
    if (lesson) {
      saveContinueLearning({
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.shortName || subject.name,
        unitNumber: unit.number,
        topicId: topic.id,
        topicTitle: topic.title,
        lessonId: lesson.id,
        mode: 'learn',
        scrollPos: 0,
        lastActive: new Date().toISOString(),
      })
    }
    setMascot(mascot, 'explaining', `Let's dig into ${topic.title}.`)
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              asChild
              className="cursor-pointer"
            >
              <span onClick={() => setLearnContext({ subjectId: null, topicId: null, lessonId: null })}>
                Subjects
              </span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{subject.shortName || subject.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Subject header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-5 flex items-start gap-4"
        style={{ backgroundColor: `${subject.accentColor}0d`, borderColor: `${subject.accentColor}33` }}
      >
        <Mascot mascot={mascot} state="greeting" size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold">{subject.name}</h1>
            <Badge variant="outline" className="text-meta">{subject.code}</Badge>
            <Badge variant="secondary" className="text-meta">{subject.credits} credits</Badge>
          </div>
          {subject.description && (
            <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-background/70 px-2 py-1">
              {subject.units.length} units
            </span>
            <span className="rounded-md bg-background/70 px-2 py-1">
              {subject.units.reduce((a, u) => a + u.topics.length, 0)} topics
            </span>
            <span className="rounded-md bg-background/70 px-2 py-1">
              {subject.units.reduce(
                (a, u) => a + (u.lessons?.length || 0) + u.topics.reduce((b, t) => b + (t.lessons?.length || 0), 0),
                0
              )}{' '}
              lessons
            </span>
          </div>
        </div>
      </motion.div>

      {/* Units accordion */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: subject.accentColor }} />
            Units &amp; Topics
          </CardTitle>
          <CardDescription className="text-xs">
            Expand a unit to see its topics. Pick any topic to start the lesson.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subject.units.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No units defined for this subject yet.
            </p>
          ) : (
            <Accordion
              type="multiple"
              value={openUnits}
              onValueChange={setOpenUnits}
              className="w-full"
            >
              {subject.units.map((unit) => {
                const totalLessons =
                  (unit.lessons?.length || 0) +
                  unit.topics.reduce((b, t) => b + (t.lessons?.length || 0), 0)
                const doneLessons =
                  (unit.lessons?.filter((l) => completedIds.has(l.id)).length || 0) +
                  unit.topics.reduce(
                    (b, t) => b + (t.lessons?.filter((l) => completedIds.has(l.id)).length || 0),
                    0
                  )
                const unitPct = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0
                return (
                  <AccordionItem key={unit.id} value={unit.id} className="border rounded-lg px-4 mb-2 last:mb-0">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div
                          className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm"
                          style={{ backgroundColor: `${subject.accentColor}1a`, color: subject.accentColor }}
                        >
                          U{unit.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{unit.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-meta">{unit.weightage}% weight</Badge>
                            <span className="text-meta text-muted-foreground">{unit.topics.length} topics</span>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 w-32" onClick={(e) => e.stopPropagation()}>
                          <Progress
                            value={unitPct}
                            className="h-1.5"
                            style={{ '--progress-color': subject.accentColor } as React.CSSProperties}
                          />
                          <span className="text-meta text-muted-foreground w-8 text-right">{unitPct}%</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {unit.description && (
                        <p className="text-xs text-muted-foreground mb-3">{unit.description}</p>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {unit.topics.map((topic) => {
                          const hasLesson =
                            (topic.lessons && topic.lessons.length > 0) ||
                            (unit.lessons && unit.lessons.some((l) => (l as unknown as { topicId?: string }).topicId === topic.id))
                          const topicDone = topic.lessons?.some((l) => completedIds.has(l.id)) || false
                          return (
                            <button
                              key={topic.id}
                              onClick={() => handleTopicClick(unit, topic)}
                              disabled={!hasLesson}
                              className={cn(
                                'group flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
                                hasLesson
                                  ? 'hover:border-primary/40 hover:shadow-sm cursor-pointer'
                                  : 'opacity-60 cursor-not-allowed bg-muted/30'
                              )}
                            >
                              <div
                                className="mt-0.5 h-6 w-6 shrink-0 rounded-md flex items-center justify-center"
                                style={{
                                  backgroundColor: topicDone ? subject.accentColor : `${subject.accentColor}1a`,
                                  color: topicDone ? '#fff' : subject.accentColor,
                                }}
                              >
                                {topicDone ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium leading-tight">{topic.title}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <Badge variant={DIFFICULTY_VARIANT[topic.difficulty] || 'secondary'} className="text-meta capitalize">
                                    {topic.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="text-meta">{topic.examWeightage}% exam</Badge>
                                  {!hasLesson && (
                                    <Badge variant="outline" className="text-meta text-muted-foreground">Soon</Badge>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stage 3: Lesson view with 5 modes
// ---------------------------------------------------------------------------
interface LessonViewProps {
  subject: Subject
  topicId: string
  lessonId: string | null
  mode: LearningMode
  setLearnContext: (ctx: {
    subjectId?: string | null
    unitNumber?: number | null
    topicId?: string | null
    lessonId?: string | null
    mode?: LearningMode
  }) => void
  saveContinueLearning: (c: {
    subjectId: string
    subjectCode: string
    subjectName: string
    unitNumber: number
    topicId: string
    topicTitle: string
    lessonId: string
    mode: LearningMode
    scrollPos: number
    lastActive: string
  }) => void
  setMascot: (m: MascotKey, state?: import('@/lib/types').MascotState, message?: string | null) => void
  pushMascotToast: (t: { mascot: MascotKey; state: import('@/lib/types').MascotState; message: string }) => void
  addXp: (n: number) => void
}

function LessonView(props: LessonViewProps) {
  const { subject, topicId, lessonId, mode, setLearnContext, saveContinueLearning, setMascot, pushMascotToast, addXp } = props
  const { pref } = usePrefs()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [completions, setCompletions] = useState<LessonCompletion[]>([])
  const [loadingProgress, setLoadingProgress] = useState(true)
  const [marking, setMarking] = useState(false)

  const topic = useMemo(() => findTopicById(subject, topicId), [subject, topicId])
  const unit = useMemo(() => findUnitForTopic(subject, topicId), [subject, topicId])
  const lesson = useMemo(
    () => (lessonId ? findLessonById(subject, lessonId) : findLessonForTopic(subject, topicId)),
    [subject, lessonId, topicId]
  )

  const mascot = (subject.mascotKey || 'leo') as MascotKey

  // Fetch existing completions
  const refreshCompletions = useCallback(() => {
    fetch('/api/progress/lesson')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setCompletions(d.data || [])
      })
      .catch(() => {})
      .finally(() => setLoadingProgress(false))
  }, [])

  useEffect(() => {
    refreshCompletions()
  }, [refreshCompletions, lessonId])

  // Mascot greeting on entering a mode
  useEffect(() => {
    if (!topic) return
    const msg = MASCOT_MESSAGES[mode].replace('{topic}', topic.title)
    setMascot(mascot, mode === 'practise' ? 'hinting' : 'explaining', msg)
  }, [mode, topic, mascot, setMascot])

  // Scroll restore on mode change
  useEffect(() => {
    if (scrollRef.current) {
      const existing = completions.find((c) => c.lessonId === lesson?.id && c.mode === mode)
      if (existing?.scrollPos) {
        scrollRef.current.scrollTo({ top: existing.scrollPos, behavior: 'auto' })
      } else {
        scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [mode, lesson?.id, completions])

  // Persist scroll position periodically
  useEffect(() => {
    if (!lesson) return
    const interval = setInterval(() => {
      const pos = scrollRef.current?.scrollTop || 0
      fetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id, mode, progress: 0, scrollPos: pos, completed: false }),
      }).catch(() => {})
    }, 8000)
    return () => clearInterval(interval)
  }, [lesson, mode])

  // Save continue learning context
  useEffect(() => {
    if (lesson && topic && unit) {
      saveContinueLearning({
        subjectId: subject.id,
        subjectCode: subject.code,
        subjectName: subject.shortName || subject.name,
        unitNumber: unit.number,
        topicId: topic.id,
        topicTitle: topic.title,
        lessonId: lesson.id,
        mode,
        scrollPos: scrollRef.current?.scrollTop || 0,
        lastActive: new Date().toISOString(),
      })
    }
  }, [lesson, topic, unit, mode, subject, saveContinueLearning])

  const modeCompletion = useMemo(() => {
    const map: Record<LearningMode, boolean> = {
      learn: false, simplify: false, visualise: false, practise: false, revise: false,
    }
    for (const c of completions) {
      if (c.lessonId === lesson?.id && c.completedAt && c.mode in map) {
        map[c.mode as LearningMode] = true
      }
    }
    return map
  }, [completions, lesson?.id])

  const completedCount = Object.values(modeCompletion).filter(Boolean).length
  const overallPct = Math.round((completedCount / 5) * 100)

  const handleModeChange = (newMode: LearningMode) => {
    setLearnContext({ mode: newMode })
  }

  const handleMarkComplete = async () => {
    if (!lesson) return
    setMarking(true)
    try {
      const res = await fetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: lesson.id, mode, progress: 100, completed: true }),
      })
      const data = await res.json()
      if (data.ok) {
        addXp(20)
        pushMascotToast({
          mascot,
          state: 'achievement',
          message: `+20 XP! ${MODE_LABELS[mode]} mode complete. Keep going!`,
        })
        refreshCompletions()
      }
    } catch {
      pushMascotToast({ mascot, state: 'warning', message: 'Could not save progress. Try again.' })
    } finally {
      setMarking(false)
    }
  }

  if (!topic || !unit) {
    return (
      <div className="space-y-4">
        <BackToSubject subject={subject} setLearnContext={setLearnContext} />
        <Card>
          <CardContent className="p-8 text-center">
            <Mascot mascot={mascot} state="rest" size={64} className="mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">
              Topic not found. It may have been moved.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })}
            >
              Back to {subject.shortName || subject.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="space-y-4">
        <LessonBreadcrumb
          subject={subject}
          unit={unit}
          topic={topic}
          setLearnContext={setLearnContext}
        />
        <Card>
          <CardContent className="p-8 text-center">
            <Mascot mascot={mascot} state="hinting" size={72} className="mx-auto" />
            <p className="text-base font-medium mt-3">No lesson yet for this topic</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              We're writing the structured lesson for <strong>{topic.title}</strong>.
              In the meantime, ask the AI tutor or check the materials section.
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })}
              >
                Pick another topic
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <LessonBreadcrumb
        subject={subject}
        unit={unit}
        topic={topic}
        setLearnContext={setLearnContext}
      />

      {/* Lesson header card */}
      <Card
        className="overflow-hidden"
        style={{ borderColor: `${subject.accentColor}33` }}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge variant="outline" className="text-meta">{subject.code}</Badge>
                <Badge variant="outline" className="text-meta">Unit {unit.number}</Badge>
                <Badge variant={DIFFICULTY_VARIANT[topic.difficulty] || 'secondary'} className="text-meta capitalize">
                  {topic.difficulty}
                </Badge>
                <Badge variant="outline" className="text-meta">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {lesson.durationMin} min
                </Badge>
              </div>
              <h1 className="text-xl md:text-2xl font-bold leading-tight">{lesson.title}</h1>
              {topic.description && (
                <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
              )}
            </div>
            <div className="hidden md:block shrink-0">
              <Mascot mascot={mascot} state="explaining" size={72} />
            </div>
          </div>

          {/* Mode progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-meta text-muted-foreground">
              <span>5-mode completion</span>
              <span>{completedCount}/5 modes · {overallPct}%</span>
            </div>
            <Progress
              value={overallPct}
              className="h-1.5"
              style={{ '--progress-color': subject.accentColor } as React.CSSProperties}
            />
            <div className="flex gap-1 mt-1.5">
              {LEARNING_MODES.map((m) => (
                <div
                  key={m.key}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    backgroundColor: modeCompletion[m.key] ? subject.accentColor : 'var(--muted)',
                  }}
                  title={`${MODE_LABELS[m.key]} ${modeCompletion[m.key] ? '✓' : '—'}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode switcher */}
      <ModeSwitcher
        currentMode={mode}
        accent={subject.accentColor}
        onChange={handleModeChange}
        completed={modeCompletion}
        reducedMotion={pref.reducedMotion}
      />

      {/* Mode content + mascot */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
        <ScrollArea
          ref={scrollRef as any}
          className={cn(
            'h-[calc(100vh-22rem)] min-h-[400px] rounded-xl border bg-card scroll-area-lernio'
          )}
        >
          <div className="p-5 md:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: pref.reducedMotion ? 0 : 0.25 }}
                className="lesson-prose"
              >
                {mode === 'learn' && (
                  <LearnMode lesson={lesson} subject={subject} />
                )}
                {mode === 'simplify' && (
                  <SimplifyMode lesson={lesson} subject={subject} />
                )}
                {mode === 'visualise' && (
                  <VisualiseMode lesson={lesson} topic={topic} subject={subject} />
                )}
                {mode === 'practise' && (
                  <PractiseMode lesson={lesson} subject={subject} unit={unit} />
                )}
                {mode === 'revise' && (
                  <ReviseMode lesson={lesson} subject={subject} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Mark as complete */}
            <Separator className="my-6" />
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {modeCompletion[mode] ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" style={{ color: subject.accentColor }} />
                    <span>{MODE_LABELS[mode]} mode completed. Try another mode or topic.</span>
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    <span>Finished this mode? Mark it complete for +20 XP.</span>
                  </>
                )}
              </div>
              <Button
                onClick={handleMarkComplete}
                disabled={marking || modeCompletion[mode]}
                style={modeCompletion[mode] ? {} : { backgroundColor: subject.accentColor, borderColor: subject.accentColor }}
                className="gap-2"
              >
                {modeCompletion[mode] ? (
                  <>
                    <Check className="h-4 w-4" /> Completed
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" /> Mark as Complete
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>

        {/* Mascot side rail */}
        <Card className="lg:w-64 shrink-0 hidden lg:block">
          <CardContent className="p-4 flex flex-col items-center text-center gap-3">
            <Mascot mascot={mascot} state="explaining" size={72} />
            <div>
              <p className="text-xs font-semibold">
                {mascot === 'byte' ? 'Byte' : mascot === 'coda' ? 'Coda' : mascot === 'pico' ? 'Pico' : mascot === 'nova' ? 'Nova' : 'LEO'}
              </p>
              <p className="text-meta text-muted-foreground">
                {subject.shortName || subject.name} guide
              </p>
            </div>
            <div
              className="rounded-lg p-2.5 text-xs text-left w-full"
              style={{ backgroundColor: `${subject.accentColor}0d` }}
            >
              {MASCOT_MESSAGES[mode].replace('{topic}', topic.title)}
            </div>
            <div className="text-meta text-muted-foreground w-full text-left">
              <p className="font-medium mb-1">Quick jump</p>
              <div className="flex flex-wrap gap-1">
                {LEARNING_MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => handleModeChange(m.key)}
                    className={cn(
                      'px-2 py-0.5 rounded text-meta border transition-colors',
                      m.key === mode ? 'text-white' : 'hover:bg-muted'
                    )}
                    style={m.key === mode ? { backgroundColor: subject.accentColor, borderColor: subject.accentColor } : {}}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Breadcrumb
// ---------------------------------------------------------------------------
function LessonBreadcrumb({
  subject,
  unit,
  topic,
  setLearnContext,
}: {
  subject: Subject
  unit: Unit
  topic: Topic
  setLearnContext: (ctx: {
    subjectId?: string | null
    unitNumber?: number | null
    topicId?: string | null
    lessonId?: string | null
    mode?: LearningMode
  }) => void
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <span
              className="cursor-pointer"
              onClick={() => setLearnContext({ subjectId: null, topicId: null, lessonId: null })}
            >
              Subjects
            </span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <span
              className="cursor-pointer"
              onClick={() => setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })}
            >
              {subject.shortName || subject.name}
            </span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <span
              className="cursor-pointer"
              onClick={() => setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })}
            >
              Unit {unit.number}
            </span>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage className="truncate max-w-[180px] sm:max-w-xs">{topic.title}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function BackToSubject({
  subject,
  setLearnContext,
}: {
  subject: Subject
  setLearnContext: (ctx: { subjectId?: string | null; topicId?: string | null; lessonId?: string | null }) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1"
      onClick={() => setLearnContext({ subjectId: subject.id, topicId: null, lessonId: null })}
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Back to {subject.shortName || subject.name}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Mode switcher
// ---------------------------------------------------------------------------
function ModeSwitcher({
  currentMode,
  accent,
  onChange,
  completed,
  reducedMotion,
}: {
  currentMode: LearningMode
  accent: string
  onChange: (m: LearningMode) => void
  completed: Record<LearningMode, boolean>
  reducedMotion: boolean
}) {
  return (
    <div className="overflow-x-auto -mx-1 px-1 pb-1">
      <div className="flex gap-2 min-w-max">
        {LEARNING_MODES.map((m) => {
          const Icon = MODE_ICONS[m.key]
          const isActive = m.key === currentMode
          const isDone = completed[m.key]
          return (
            <button
              key={m.key}
              onClick={() => onChange(m.key)}
              aria-pressed={isActive}
              className={cn(
                'group relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all',
                isActive ? 'text-white shadow-sm' : 'hover:bg-muted text-muted-foreground'
              )}
              style={
                isActive
                  ? { backgroundColor: accent, borderColor: accent }
                  : {}
              }
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{m.label}</span>
              {isDone && (
                <span
                  className="ml-1 h-4 w-4 rounded-full flex items-center justify-center"
                  style={isActive ? { backgroundColor: 'rgba(255,255,255,0.25)' } : { backgroundColor: accent }}
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </span>
              )}
              {isActive && !reducedMotion && (
                <motion.div
                  layoutId="mode-underline"
                  className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty mode placeholder
// ---------------------------------------------------------------------------
function EmptyMode({ mascot, message }: { mascot: MascotKey; message: string }) {
  return (
    <div className="text-center py-10">
      <Mascot mascot={mascot} state="hinting" size={72} className="mx-auto" />
      <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto">{message}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LEARN mode
// ---------------------------------------------------------------------------
function LearnMode({ lesson, subject }: { lesson: Lesson; subject: Subject }) {
  const c = safeParse<LearnContent>(lesson.learnContent)
  const accent = subject.accentColor
  const mascot = (subject.mascotKey || 'leo') as MascotKey

  if (!c) {
    return <EmptyMode mascot={mascot} message="The structured lesson is being written. Try Simplify mode for a quick version." />
  }

  return (
    <div className="space-y-5">
      {/* Definition card */}
      <div
        className="rounded-xl border-l-4 p-4"
        style={{ backgroundColor: `${accent}0d`, borderColor: accent }}
      >
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4" style={{ color: accent }} />
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
            Definition
          </h2>
        </div>
        <p className="text-sm leading-relaxed">{c.definition}</p>
      </div>

      {/* Purpose */}
      <Section title="Why it matters" icon={<Lightbulb className="h-4 w-4" />} accent={accent}>
        <p className="text-sm">{c.purpose}</p>
      </Section>

      {/* Prerequisites */}
      {c.prerequisites?.length > 0 && (
        <Section title="Prerequisites" icon={<CheckCircle2 className="h-4 w-4" />} accent={accent}>
          <div className="flex flex-wrap gap-2">
            {c.prerequisites.map((p, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
            ))}
          </div>
        </Section>
      )}

      {/* Core concepts */}
      {c.coreConcepts?.length > 0 && (
        <Section title="Core Concepts" icon={<Layers className="h-4 w-4" />} accent={accent}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 not-prose">
            {c.coreConcepts.map((cc, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-sm font-semibold mb-1" style={{ color: accent }}>
                    {cc.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cc.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Step-by-step */}
      {c.stepByStep?.length > 0 && (
        <Section title="Step-by-Step" icon={<ListChecks className="h-4 w-4" />} accent={accent}>
          <ol className="space-y-2 not-prose">
            {c.stepByStep.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <span className="text-sm pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Examples */}
      {c.examples?.length > 0 && (
        <Section title="Examples" icon={<Code2 className="h-4 w-4" />} accent={accent}>
          <div className="space-y-2 not-prose">
            {c.examples.map((ex, i) => (
              <div key={i} className="rounded-lg border bg-muted/30 overflow-hidden">
                <div className="px-3 py-2 border-b bg-muted/50">
                  <p className="text-xs font-semibold">{ex.title}</p>
                </div>
                <pre className="px-3 py-2 text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                  {ex.content}
                </pre>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Common errors */}
      {c.commonErrors?.length > 0 && (
        <Section title="Common Errors" icon={<AlertTriangle className="h-4 w-4" />} accent="#ef4444">
          <div className="space-y-2 not-prose">
            {c.commonErrors.map((e, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-lg border-l-4 border-destructive/50 bg-destructive/5 p-2.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs">{e}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Exam points */}
      {c.examPoints?.length > 0 && (
        <Section title="Exam Points" icon={<GraduationCap className="h-4 w-4" />} accent={accent}>
          <ul className="space-y-1.5 not-prose">
            {c.examPoints.map((e, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Summary */}
      <div className="rounded-xl bg-muted/40 border p-4">
        <div className="flex items-center gap-2 mb-1">
          <Quote className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Summary</h3>
        </div>
        <p className="text-sm text-muted-foreground italic">{c.summary}</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SIMPLIFY mode
// ---------------------------------------------------------------------------
function SimplifyMode({ lesson, subject }: { lesson: Lesson; subject: Subject }) {
  const c = safeParse<SimplifyContent>(lesson.simplifyContent)
  const accent = subject.accentColor
  const mascot = (subject.mascotKey || 'leo') as MascotKey

  if (!c) {
    return <EmptyMode mascot={mascot} message="Simple version coming soon. Try the Learn tab for the full lesson." />
  }

  return (
    <div className="space-y-5">
      <Section title="Simple English" icon={<Sparkles className="h-4 w-4" />} accent={accent}>
        <p className="text-sm leading-relaxed">{c.simpleEnglish}</p>
      </Section>

      <Section title="Hinglish" icon={<Sparkles className="h-4 w-4" />} accent={accent} tinted>
        <p className="text-sm leading-relaxed">{c.hinglish}</p>
      </Section>

      <Section title="Marathi (मराठी)" icon={<Sparkles className="h-4 w-4" />} accent={accent} tinted>
        <p className="text-sm leading-relaxed">
          {c.simpleEnglish
            ? 'मराठी आवृत्ती लवकरच येत आहे. शिकायला सुरुवात करा — English + Hinglish वरून संकल्पना समजून घ्या.'
            : '—'}
        </p>
      </Section>

      {/* Analogy with mascot bubble */}
      <Card style={{ borderColor: `${accent}33` }}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Mascot mascot={mascot} state="hinting" size={48} />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
                Analogy
              </p>
              <p className="text-sm leading-relaxed">{c.analogy}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Section title="5-Minute Explanation" icon={<Clock className="h-4 w-4" />} accent={accent}>
        <p className="text-sm leading-relaxed whitespace-pre-line">{c.fiveMinute}</p>
      </Section>

      <Section title="1-Minute Recap" icon={<Zap className="h-4 w-4" />} accent={accent} tinted>
        <p className="text-sm leading-relaxed">{c.oneMinuteRecap}</p>
      </Section>

      <Section title="Exam-Answer Format" icon={<GraduationCap className="h-4 w-4" />} accent={accent}>
        <p className="text-sm leading-relaxed">{c.examFormat}</p>
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// VISUALISE mode
// ---------------------------------------------------------------------------
function VisualiseMode({
  lesson,
  topic,
  subject,
}: {
  lesson: Lesson
  topic: Topic
  subject: Subject
}) {
  const c = safeParse<VisualiseContent>(lesson.visualiseContent)
  const accent = subject.accentColor
  const mascot = (subject.mascotKey || 'leo') as MascotKey
  const { pref } = usePrefs()

  if (!c) {
    return (
      <EmptyMode
        mascot={mascot}
        message="A visual walkthrough is being prepared. Check the Learn tab for the explanation."
      />
    )
  }

  const slug = topic.slug.toLowerCase()

  return (
    <div className="space-y-4">
      <Section title="Visualization" icon={<Play className="h-4 w-4" />} accent={accent}>
        <p className="text-sm">{c.description}</p>
        <Badge variant="outline" className="text-meta mt-2 capitalize">
          type: {c.type}
        </Badge>
      </Section>

      {/* Topic-specific interactive visualizers */}
      {slug.includes('sort') && (
        <SortingVisualizer accent={accent} mascot={mascot} steps={c.steps} />
      )}
      {slug.includes('stack') && (
        <StackVisualizer accent={accent} mascot={mascot} steps={c.steps} />
      )}
      {slug.includes('queue') && (
        <QueueVisualizer accent={accent} mascot={mascot} steps={c.steps} />
      )}
      {slug.includes('linked-list') && (
        <LinkedListVisualizer accent={accent} mascot={mascot} steps={c.steps} />
      )}

      {/* Generic step listing + complexity */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">
            Algorithm steps
          </p>
          <ol className="space-y-2 not-prose">
            {c.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-meta font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </span>
                <span className="text-xs pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Time/space complexity — generic note */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-meta uppercase tracking-wide text-muted-foreground">Time</p>
            <p className="text-base font-mono font-bold mt-1" style={{ color: accent }}>
              see lesson
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-meta uppercase tracking-wide text-muted-foreground">Space</p>
            <p className="text-base font-mono font-bold mt-1" style={{ color: accent }}>
              see lesson
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reduced motion note */}
      {pref.reducedMotion && (
        <div className="rounded-lg border-l-4 border-amber-500 bg-amber-500/5 p-3">
          <p className="text-xs">
            <strong>Reduced motion:</strong> {c.reducedMotionAlt}
          </p>
        </div>
      )}

      {/* Pseudocode toggle */}
      <PseudocodeToggle accent={accent} slug={slug} />
    </div>
  )
}

function PseudocodeToggle({ accent, slug }: { accent: string; slug: string }) {
  const [open, setOpen] = useState(false)
  const pseudo = useMemo(() => PSEUDOCODE[slug] || null, [slug])
  if (!pseudo) return null
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4" style={{ color: accent }} />
              <span className="text-sm font-semibold">View pseudocode</span>
            </div>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
            {pseudo}
          </pre>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

const PSEUDOCODE: Record<string, string> = {
  'bubble-sort': `for i = 0 to n-2:
  swapped = false
  for j = 0 to n-i-2:
    if arr[j] > arr[j+1]:
      swap(arr[j], arr[j+1])
      swapped = true
  if not swapped: break`,
  'stack-basics': `push(x):  top++; arr[top] = x
pop():   x = arr[top]; top--; return x
peek():  return arr[top]
isEmpty(): return top == -1`,
  'queue-basics': `enqueue(x): rear++; arr[rear] = x
dequeue(): x = arr[front]; front++; return x
isEmpty(): return front > rear`,
  'singly-linked-list': `insertAtEnd(x):
  new = Node(x)
  if head == null: head = new; return
  cur = head
  while cur.next != null: cur = cur.next
  cur.next = new`,
}

// ---------------------------------------------------------------------------
// Sorting visualizer
// ---------------------------------------------------------------------------
function SortingVisualizer({
  accent,
  mascot,
  steps,
}: {
  accent: string
  mascot: MascotKey
  steps: string[]
}) {
  const { pref } = usePrefs()
  const [arr, setArr] = useState<number[]>([5, 3, 8, 1, 6, 4])
  const [pass, setPass] = useState(0)
  const [idx, setIdx] = useState(0)
  const [swaps, setSwaps] = useState(0)
  const [done, setDone] = useState(false)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maxVal = Math.max(...arr)

  const step = useCallback(() => {
    setArr((prev) => {
      const a = [...prev]
      const n = a.length
      let nextPass = pass
      let nextIdx = idx
      let nextSwaps = swaps
      let nextDone = done

      if (nextIdx < n - pass - 1) {
        if (a[nextIdx] > a[nextIdx + 1]) {
          ;[a[nextIdx], a[nextIdx + 1]] = [a[nextIdx + 1], a[nextIdx]]
          nextSwaps++
        }
        nextIdx++
      } else {
        nextPass++
        nextIdx = 0
        if (nextPass >= n - 1) {
          nextDone = true
        }
      }

      setPass(nextPass)
      setIdx(nextIdx)
      setSwaps(nextSwaps)
      setDone(nextDone)
      return a
    })
  }, [pass, idx, swaps, done])

  useEffect(() => {
    if (!playing || done) return
    timerRef.current = setTimeout(() => {
      step()
    }, pref.reducedMotion ? 600 : 500)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [playing, done, step, pref.reducedMotion])

  const restart = () => {
    setArr([5, 3, 8, 1, 6, 4])
    setPass(0)
    setIdx(0)
    setSwaps(0)
    setDone(false)
    setPlaying(false)
  }

  const maxIdx = arr.length - pass - 1
  const isComparing = (i: number) => !done && (i === idx || i === idx + 1) && idx < maxIdx
  const isSorted = (i: number) => done || i >= arr.length - pass

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Bubble Sort Visualizer
          </p>
          <div className="flex gap-2 text-meta">
            <Badge variant="outline">Pass {pass}</Badge>
            <Badge variant="outline">Index {idx}</Badge>
            <Badge variant="outline">Swaps {swaps}</Badge>
            {done && <Badge style={{ backgroundColor: accent, color: '#fff' }}>Sorted!</Badge>}
          </div>
        </div>

        {/* Bars */}
        <div className="flex items-end justify-center gap-1.5 h-40 bg-muted/30 rounded-lg p-3">
          {arr.map((v, i) => {
            const comparing = isComparing(i)
            const sorted = isSorted(i)
            let bg = accent
            if (sorted) bg = '#10b981'
            if (comparing) bg = '#f97316'
            return (
              <motion.div
                key={i}
                layout={!pref.reducedMotion}
                animate={{ height: `${(v / maxVal) * 100}%` }}
                transition={{ duration: pref.reducedMotion ? 0 : 0.3 }}
                className="flex-1 min-w-[28px] max-w-[48px] rounded-t flex items-end justify-center text-meta font-bold text-white pb-1"
                style={{ backgroundColor: bg, minHeight: '12px' }}
              >
                {v}
              </motion.div>
            )
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPlaying((p) => !p)}
            disabled={done}
            className="gap-1.5 h-8"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!done) step()
            }}
            disabled={done}
            className="gap-1.5 h-8"
          >
            <SkipForward className="h-3.5 w-3.5" /> Step
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={restart}
            className="gap-1.5 h-8"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </Button>
        </div>

        {/* Step caption */}
        <div
          className="rounded-lg p-2 text-xs text-center"
          style={{ backgroundColor: `${accent}0d` }}
        >
          {done
            ? 'Array sorted! All bars are green.'
            : `Comparing indices ${idx} and ${idx + 1} — ${arr[idx] > arr[idx + 1] ? 'swap needed' : 'no swap'}`}
        </div>

        {steps.length > 0 && (
          <div className="text-meta text-muted-foreground text-center">
            Step {Math.min(idx + pass * (arr.length - 1) + 1, steps.length)} of {steps.length}: {steps[Math.min(idx + pass * (arr.length - 1), steps.length - 1)]}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Stack visualizer
// ---------------------------------------------------------------------------
function StackVisualizer({
  accent,
  mascot,
}: {
  accent: string
  mascot: MascotKey
  steps: string[]
}) {
  const [stack, setStack] = useState<number[]>([3, 7, 12])
  const counter = useRef(20)
  const push = () => {
    counter.current++
    setStack((s) => [...s, counter.current])
  }
  const pop = () => {
    setStack((s) => (s.length > 0 ? s.slice(0, -1) : s))
  }
  const reset = () => {
    setStack([3, 7, 12])
    counter.current = 20
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Stack (LIFO) Visualizer
          </p>
          <Badge variant="outline" className="text-meta">top = {stack.length - 1}</Badge>
        </div>

        <div className="flex justify-center">
          <div className="flex flex-col-reverse gap-1 min-h-[160px] w-48 items-stretch border-2 border-dashed border-border rounded-lg p-2">
            {stack.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center self-center">Stack empty</p>
            ) : (
              stack.map((v, i) => (
                <motion.div
                  key={`${i}-${v}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-md text-center py-2 text-sm font-mono font-bold text-white"
                  style={{
                    backgroundColor: i === stack.length - 1 ? accent : `${accent}99`,
                  }}
                >
                  {v}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={push} className="gap-1.5 h-8">
            <ArrowRight className="h-3.5 w-3.5 rotate-[-30deg]" /> Push
          </Button>
          <Button size="sm" variant="outline" onClick={pop} className="gap-1.5 h-8">
            <ArrowLeft className="h-3.5 w-3.5 rotate-[-30deg]" /> Pop
          </Button>
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 h-8">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="rounded-lg p-2 text-xs text-center" style={{ backgroundColor: `${accent}0d` }}>
          {stack.length > 0
            ? `peek() returns ${stack[stack.length - 1]} — the top element`
            : 'pop() on empty stack → underflow!'}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Queue visualizer
// ---------------------------------------------------------------------------
function QueueVisualizer({
  accent,
  mascot,
}: {
  accent: string
  mascot: MascotKey
  steps: string[]
}) {
  const [queue, setQueue] = useState<number[]>([5, 9, 14])
  const counter = useRef(20)
  const enqueue = () => {
    counter.current++
    setQueue((q) => [...q, counter.current])
  }
  const dequeue = () => {
    setQueue((q) => (q.length > 0 ? q.slice(1) : q))
  }
  const reset = () => {
    setQueue([5, 9, 14])
    counter.current = 20
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Queue (FIFO) Visualizer
          </p>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-meta">front = 0</Badge>
            <Badge variant="outline" className="text-meta">rear = {queue.length - 1}</Badge>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex gap-1 min-h-[64px] items-stretch border-2 border-dashed border-border rounded-lg p-2 w-full">
            {queue.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center self-center w-full">Queue empty</p>
            ) : (
              queue.map((v, i) => (
                <motion.div
                  key={`${i}-${v}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-1 min-w-[40px] rounded-md text-center py-3 text-sm font-mono font-bold text-white"
                  style={{
                    backgroundColor: i === 0 ? '#f97316' : i === queue.length - 1 ? accent : `${accent}99`,
                  }}
                >
                  {v}
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-between text-meta text-muted-foreground px-1">
          <span>↑ front (dequeue)</span>
          <span>rear (enqueue) ↑</span>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={enqueue} className="gap-1.5 h-8">
            <ArrowRight className="h-3.5 w-3.5" /> Enqueue
          </Button>
          <Button size="sm" variant="outline" onClick={dequeue} className="gap-1.5 h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Dequeue
          </Button>
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 h-8">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="rounded-lg p-2 text-xs text-center" style={{ backgroundColor: `${accent}0d` }}>
          {queue.length > 0
            ? `dequeue() returns ${queue[0]} (first inserted)`
            : 'dequeue() on empty queue → underflow!'}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Linked list visualizer
// ---------------------------------------------------------------------------
function LinkedListVisualizer({
  accent,
  mascot,
}: {
  accent: string
  mascot: MascotKey
  steps: string[]
}) {
  const [nodes, setNodes] = useState<number[]>([10, 25, 38])
  const counter = useRef(50)
  const insertEnd = () => {
    counter.current += 7
    setNodes((n) => [...n, counter.current])
  }
  const deleteEnd = () => {
    setNodes((n) => (n.length > 0 ? n.slice(0, -1) : n))
  }
  const reset = () => {
    setNodes([10, 25, 38])
    counter.current = 50
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Singly Linked List Visualizer
          </p>
          <Badge variant="outline" className="text-meta">{nodes.length} nodes</Badge>
        </div>

        <div className="flex justify-center items-center overflow-x-auto">
          <div className="flex gap-1 items-center min-h-[64px]">
            {nodes.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4">head → null</p>
            ) : (
              <>
                <span className="text-xs font-mono font-bold mr-2" style={{ color: accent }}>head →</span>
                {nodes.map((v, i) => (
                  <div key={`${i}-${v}`} className="flex items-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex"
                    >
                      <div
                        className="px-3 py-2 text-sm font-mono font-bold text-white rounded-l-md"
                        style={{ backgroundColor: accent }}
                      >
                        {v}
                      </div>
                      <div
                        className="px-2 py-2 text-xs text-white rounded-r-md"
                        style={{ backgroundColor: `${accent}99` }}
                      >
                        →
                      </div>
                    </motion.div>
                  </div>
                ))}
                <span className="text-xs font-mono font-bold ml-1">null</span>
              </>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={insertEnd} className="gap-1.5 h-8">
            <ArrowRight className="h-3.5 w-3.5" /> Insert end
          </Button>
          <Button size="sm" variant="outline" onClick={deleteEnd} className="gap-1.5 h-8">
            <ArrowLeft className="h-3.5 w-3.5" /> Delete end
          </Button>
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 h-8">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>

        <div className="rounded-lg p-2 text-xs text-center" style={{ backgroundColor: `${accent}0d` }}>
          Each node = data + pointer to next. Last node points to null.
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// PRACTISE mode
// ---------------------------------------------------------------------------
function PractiseMode({
  lesson,
  subject,
  unit,
}: {
  lesson: Lesson
  subject: Subject
  unit: Unit
}) {
  const c = safeParse<PractiseContent>(lesson.practiseContent)
  const accent = subject.accentColor
  const mascot = (subject.mascotKey || 'leo') as MascotKey
  const [confidence, setConfidence] = useState(0)

  if (!c) {
    return (
      <EmptyMode
        mascot={mascot}
        message="Practice questions are being curated. Try the Learn tab or the Practice section."
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Guided examples */}
      {c.guidedExamples?.length > 0 && (
        <Section title="Guided Examples" icon={<GraduationCap className="h-4 w-4" />} accent={accent}>
          <div className="space-y-2 not-prose">
            {c.guidedExamples.map((ex, i) => (
              <GuidedExample key={i} index={i} q={ex.question} sol={ex.solution} accent={accent} />
            ))}
          </div>
        </Section>
      )}

      {/* Easy questions */}
      {c.easyQuestions?.length > 0 && (
        <QuestionBlock
          title="Easy"
          accent="#10b981"
          questions={c.easyQuestions}
          hint={c.hints[0] || 'Think simple definitions.'}
        />
      )}

      {/* Medium questions */}
      {c.mediumQuestions?.length > 0 && (
        <QuestionBlock
          title="Medium"
          accent={accent}
          questions={c.mediumQuestions}
          hint={c.hints[1] || c.hints[0] || 'Apply the concept step by step.'}
        />
      )}

      {/* Hard questions */}
      {c.hardQuestions?.length > 0 && (
        <QuestionBlock
          title="Hard"
          accent="#ef4444"
          questions={c.hardQuestions}
          hint={c.hints[2] || c.hints[c.hints.length - 1] || 'Break the problem into smaller parts.'}
        />
      )}

      {/* Confidence rating */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">
            How confident do you feel about {lesson.title}?
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                className="p-1"
                aria-label={`Rate ${n} stars`}
              >
                <Star
                  className={cn(
                    'h-7 w-7 transition-all',
                    n <= confidence ? 'fill-current' : 'fill-transparent'
                  )}
                  style={{ color: n <= confidence ? accent : 'var(--muted-foreground)' }}
                />
              </button>
            ))}
          </div>
          {confidence > 0 && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {confidence <= 2
                ? "Keep practising — you'll get it! Revisit the Learn tab."
                : confidence === 3
                  ? 'Decent. Try a harder question or move to Visualise.'
                  : 'Strong! Mark this mode complete and move to Revise.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GuidedExample({ index, q, sol, accent }: { index: number; q: string; sol: string; accent: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-muted/20">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-start justify-between gap-3 p-3 text-left hover:bg-muted/40 transition-colors rounded-xl">
          <div className="flex gap-3">
            <span
              className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {index + 1}
            </span>
            <p className="text-sm pt-0.5">{q}</p>
          </div>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 mt-1 transition-transform', open && 'rotate-180')}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Separator />
        <div className="p-3 bg-muted/30 rounded-b-xl">
          <p className="text-meta font-bold uppercase tracking-wide text-muted-foreground mb-1">
            Solution
          </p>
          <p className="text-xs leading-relaxed">{sol}</p>
        </div>
      </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function QuestionBlock({
  title,
  accent,
  questions,
  hint,
}: {
  title: string
  accent: string
  questions: string[]
  hint: string
}) {
  return (
    <Section title={`${title} Questions`} icon={<PenTool className="h-4 w-4" />} accent={accent}>
      <div className="space-y-2 not-prose">
        {questions.map((q, i) => (
          <QuestionCard key={i} index={i} question={q} hint={hint} accent={accent} />
        ))}
      </div>
    </Section>
  )
}

function QuestionCard({
  index,
  question,
  hint,
  accent,
}: {
  index: number
  question: string
  hint: string
  accent: string
}) {
  const [showHint, setShowHint] = useState(false)
  const [revealed, setRevealed] = useState(false)
  return (
    <Card className="bg-muted/20">
      <CardContent className="p-3">
        <div className="flex gap-2 items-start">
          <span
            className="shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-meta font-bold text-white mt-0.5"
            style={{ backgroundColor: accent }}
          >
            {index + 1}
          </span>
          <p className="text-sm flex-1">{question}</p>
        </div>
        <div className="flex gap-2 mt-3 ml-7">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHint((v) => !v)}
            className="h-7 text-xs gap-1"
          >
            <Lightbulb className="h-3 w-3" /> {showHint ? 'Hide hint' : 'Show hint'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRevealed((v) => !v)}
            className="h-7 text-xs gap-1"
          >
            {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {revealed ? 'Hide answer' : 'Reveal answer'}
          </Button>
        </div>
        <AnimatePresence>
          {showHint && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-7"
            >
              <div
                className="rounded-lg border-l-4 p-2 text-xs"
                style={{ borderColor: accent, backgroundColor: `${accent}0d` }}
              >
                <strong>Hint:</strong> {hint}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 ml-7"
            >
              <div className="rounded-lg border border-dashed p-2 text-xs bg-muted/30">
                <strong className="text-muted-foreground">Suggested approach:</strong> Work it out
                on paper using the steps in the Learn tab, then compare with the guided examples.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// REVISE mode
// ---------------------------------------------------------------------------
function ReviseMode({ lesson, subject }: { lesson: Lesson; subject: Subject }) {
  const c = safeParse<ReviseContent>(lesson.reviseContent)
  const accent = subject.accentColor
  const mascot = (subject.mascotKey || 'leo') as MascotKey

  if (!c) {
    return (
      <EmptyMode
        mascot={mascot}
        message="Revision notes are being prepared. Try the Learn or Simplify tab for now."
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Short notes */}
      {c.shortNotes?.length > 0 && (
        <Section title="Short Notes" icon={<ListChecks className="h-4 w-4" />} accent={accent}>
          <ul className="space-y-1.5 not-prose">
            {c.shortNotes.map((n, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <ChevronRight className="h-4 w-4 shrink-0 mt-0.5" style={{ color: accent }} />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Definitions */}
      {c.definitions?.length > 0 && (
        <Section title="Definitions" icon={<BookOpen className="h-4 w-4" />} accent={accent}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 not-prose">
            {c.definitions.map((d, i) => (
              <Card key={i} className="bg-muted/20">
                <CardContent className="p-3">
                  <p className="text-xs font-bold mb-1" style={{ color: accent }}>
                    {d.term}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{d.definition}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Formulas */}
      {c.formulas?.length > 0 && (
        <Section title="Formulas" icon={<Zap className="h-4 w-4" />} accent={accent}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 not-prose">
            {c.formulas.map((f, i) => (
              <Card key={i} className="bg-muted/20">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold">{f.name}</p>
                  <pre className="text-sm font-mono my-1.5 px-2 py-1 rounded bg-background border text-foreground overflow-x-auto">
                    {f.formula}
                  </pre>
                  <p className="text-meta text-muted-foreground">
                    <strong>Use:</strong> {f.use}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Flashcards */}
      {c.flashcards?.length > 0 && (
        <Section title="Flashcards (click to flip)" icon={<Layers className="h-4 w-4" />} accent={accent}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 not-prose">
            {c.flashcards.map((fc, i) => (
              <Flashcard key={i} front={fc.front} back={fc.back} accent={accent} />
            ))}
          </div>
        </Section>
      )}

      {/* Common confusions */}
      {c.commonConfusions?.length > 0 && (
        <Section title="Common Confusions" icon={<GitCompare className="h-4 w-4" />} accent={accent}>
          <div className="space-y-2 not-prose">
            {c.commonConfusions.map((cc, i) => (
              <Card key={i} className="bg-muted/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-meta">{cc.a}</Badge>
                    <span className="text-meta text-muted-foreground">vs</span>
                    <Badge variant="outline" className="text-meta">{cc.b}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{cc.difference}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* Mistake review prompt */}
      <Card style={{ borderColor: `${accent}33` }}>
        <CardContent className="p-4 flex items-start gap-3">
          <Mascot mascot={mascot} state="hinting" size={40} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
              Mistake review
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The mistake-review section pulls from your past attempts in the Practice module.
              Answer more questions there and weak areas will appear here automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Flashcard({ front, back, accent }: { front: string; back: string; accent: string }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <button
      onClick={() => setFlipped((v) => !v)}
      className="relative w-full text-left"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.4 }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '100px' }}
      >
        <div
          className="rounded-lg border p-3 flex flex-col justify-center"
          style={{
            backgroundColor: `${accent}0d`,
            borderColor: `${accent}33`,
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            minHeight: '100px',
          }}
        >
          <p className="text-meta uppercase tracking-wide text-muted-foreground mb-1">Q</p>
          <p className="text-sm font-medium">{front}</p>
        </div>
        <div
          className="rounded-lg border p-3 flex flex-col justify-center"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: accent,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            inset: 0,
            minHeight: '100px',
          }}
        >
          <p className="text-meta uppercase tracking-wide mb-1" style={{ color: accent }}>A</p>
          <p className="text-sm">{back}</p>
        </div>
      </motion.div>
      <div
        className="text-meta text-center mt-1 text-muted-foreground"
        style={{ position: 'relative', top: '100px' }}
      >
        {flipped ? 'Click to flip back' : 'Click to reveal answer'}
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Reusable section
// ---------------------------------------------------------------------------
function Section({
  title,
  icon,
  accent,
  children,
  tinted,
}: {
  title: string
  icon: React.ReactNode
  accent: string
  children: React.ReactNode
  tinted?: boolean
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="h-6 w-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          {icon}
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
          {title}
        </h2>
      </div>
      <div
        className={cn('rounded-lg', tinted && 'p-3 bg-muted/20')}
        style={tinted ? { backgroundColor: `${accent}0a` } : {}}
      >
        {children}
      </div>
    </div>
  )
}
