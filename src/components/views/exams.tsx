'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  FileText, Clock, Flag, AlertCircle, BarChart3, PenLine,
  CheckCircle2, XCircle, ChevronRight, Award, TrendingUp,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/components/theme-provider'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ---------------------------------------------------------------------------
// Types — match the secure API DTOs (src/lib/questions.ts).
// ---------------------------------------------------------------------------

interface ExamQuestionDTO {
  id: string
  type: string
  difficulty: string
  question: string
  options: string[] | null
  marks: number
  negativeMark: number
  subjectId: string
  unitNumber: number | null
}

interface ReviewItemDTO {
  questionId: string
  question: string
  type: string
  options: string[] | null
  answer: string | null
  isCorrect: boolean
  marks: number
  negativeMark: number
  correctAnswer: string | null
  explanation: string | null
  hint: string | null
  timeTakenMs?: number
  hintUsed?: boolean
  flagged?: boolean
}

interface ExamSubmitResponse {
  attemptId: string
  status: 'locked'
  review: ReviewItemDTO[]
  score: number
  maxScore: number
  correctCount: number
  totalQuestions: number
  negativeMarks: number
  durationMs: number
  xpAwarded: number
  xpAlreadyAwarded: boolean
  totalXp: number
}

// Response from POST /api/exams/attempt (create).
interface ExamAttemptCreateResponse {
  attemptId: string
  questions: ExamQuestionDTO[]
  durationMins: number
  startedAt: string
}

// Response from GET /api/exams/attempt/[id] when the attempt is in_progress.
interface ExamAttemptResumeResponse {
  status: 'in_progress'
  attemptId: string
  questions: ExamQuestionDTO[]
  questionIds: string[]
  durationMins: number
  startedAt: string
  answers: Record<string, string>
  flagged: string[]
  timeLeftSec: number
  currentIdx: number
  subjectId: string
  mode: string
}

// Response from GET /api/exams/attempt/[id] when the attempt is locked/submitted.
interface ExamAttemptLockedResponse {
  status: 'submitted' | 'locked'
  attemptId: string
  subjectId: string | null
  mode: string
  startedAt: string
  completedAt: string | null
  totalQuestions: number
  correctCount: number
  score: number
  maxScore: number
  durationMs: number
  negativeMarks: number
  review: ReviewItemDTO[]
}

interface EvaluationResult {
  estimatedMarks: number
  criterionScores: Record<string, number>
  correctPoints: string[]
  missingPoints: string[]
  incorrectClaims: string[]
  structureFeedback: string
  suggestedImprovedAnswer: string
  confidence: number
  estimateLabel: string
  usedFallback: boolean
}

type ExamPhase = 'setup' | 'exam' | 'results'

// ---------------------------------------------------------------------------
// Main view — 4 tabs (Chapter Test, Mock Exam, Analysis, Evaluate)
// ---------------------------------------------------------------------------

export function ExamsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mascot mascot="leo" state="explaining" size={48} />
        <div>
          <h2 className="text-lg font-bold">Exam Preparation</h2>
          <p className="text-sm text-muted-foreground">
            Server-scored chapter tests, full mock exams, and AI answer evaluation.
          </p>
        </div>
      </div>
      <Tabs defaultValue="chapter">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="chapter" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> Chapter Test</TabsTrigger>
          <TabsTrigger value="mock" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Mock Exam</TabsTrigger>
          <TabsTrigger value="analysis" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Analysis</TabsTrigger>
          <TabsTrigger value="evaluate" className="gap-1.5"><PenLine className="h-3.5 w-3.5" /> Evaluate</TabsTrigger>
        </TabsList>
        <TabsContent value="chapter"><ChapterTest /></TabsContent>
        <TabsContent value="mock"><MockExam /></TabsContent>
        <TabsContent value="analysis"><QuestionAnalysis /></TabsContent>
        <TabsContent value="evaluate"><AnswerEvaluator /></TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared exam shell — used by both Chapter Test and Mock Exam.
// Distraction-free: hides mascots when pref.hideMascotsInExams is on, no
// sidebar nav (renders as a full-screen overlay).
//
// Lifecycle (DEBUG-3): the caller creates an attempt via POST /api/exams/attempt
// and passes the attemptId + question set in. ExamShell then:
//   - autosaves to the server via PATCH /api/exams/attempt/{id} every 30s +
//     on answer/flag change (server is the source of truth for resume),
//   - submits via POST /api/exams/attempt/{id}/submit (which locks + scores),
//   - handles 409 'already submitted' gracefully by fetching the locked review.
// ---------------------------------------------------------------------------

interface ExamShellProps {
  attemptId: string
  questions: ExamQuestionDTO[]
  subjectId: string
  mode: 'chapter_test' | 'mock_exam'
  unitNumbers?: number[]
  durationMinutes: number
  // Stable localStorage key for this exam identity (subject+mode or
  // paper+mode). Used for UI state (currentIdx) + cleared on exit/submit.
  storageKey: string
  // Optional restored state (from GET /api/exams/attempt/{id}) so a resumed
  // attempt picks up exactly where the user left off.
  initialAnswers?: Record<string, string>
  initialFlagged?: string[]
  initialTimeLeftSec?: number
  initialCurrentIdx?: number
  onExit: () => void
  onComplete: (result: ExamSubmitResponse) => void
}

function ExamShell({
  attemptId,
  questions,
  durationMinutes,
  storageKey,
  initialAnswers,
  initialFlagged,
  initialTimeLeftSec,
  initialCurrentIdx,
  onExit,
  onComplete,
}: ExamShellProps) {
  // `subjectId`, `mode`, `unitNumbers` are accepted in the props for caller
  // backwards-compat but are not used inside the shell — the attempt was
  // already created with these stored server-side, and all client API calls
  // key off `attemptId` only.

  const { pref } = usePrefs()
  const { addXp } = useAppStore()
  const [currentIdx, setCurrentIdx] = useState<number>(initialCurrentIdx ?? 0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers ?? {})
  const [flagged, setFlagged] = useState<Set<string>>(new Set(initialFlagged ?? []))
  const [timeLeft, setTimeLeft] = useState<number>(initialTimeLeftSec ?? durationMinutes * 60)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const startedAtRef = useRef<number>(Date.now())
  // Absolute deadline (epoch ms) — drift-free timer source. Background tabs
  // throttle setInterval to ~1/min, so decrementing `timeLeft` by 1 each
  // tick loses time. Recomputing from the deadline fixes this, and the
  // visibilitychange listener below catches up when the tab refocuses.
  const deadlineRef = useRef<number>(Date.now() + (initialTimeLeftSec ?? durationMinutes * 60) * 1000)
  // Track the latest autosave snapshot so we don't PATCH identical payloads.
  const lastAutosaveRef = useRef<string>('')

  // Persist UI state (currentIdx) to localStorage so a refresh restores the
  // palette position. Answers are autosaved to the server below.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        currentIdx,
        attemptId,
      }))
    } catch {
      // storage full / disabled — non-fatal
    }
  }, [currentIdx, attemptId, storageKey])

  // Server autosave — every 30s + whenever answers/flagged/timeLeft change.
  // We debounce so rapid answer clicks don't spam the server.
  useEffect(() => {
    const snapshot = JSON.stringify({
      answers,
      flagged: Array.from(flagged),
      timeLeftSec: timeLeft,
      currentIdx,
    })
    // Skip if nothing changed since the last successful save.
    if (snapshot === lastAutosaveRef.current) return

    const t = setTimeout(() => {
      lastAutosaveRef.current = snapshot
      fetch(`/api/exams/attempt/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: snapshot,
      }).catch(() => {
        // Non-fatal: autosave failures don't block the exam. The next change
        // will retry. We DON'T reset lastAutosaveRef so the next save attempt
        // still goes through (with the new payload).
      })
    }, 800)

    return () => clearTimeout(t)
  }, [answers, flagged, timeLeft, currentIdx, attemptId])

  // Heartbeat autosave every 30s — guarantees timeLeft is persisted even if
  // the user steps away without changing answers (so a resume knows how much
  // time remained).
  // Periodic 30s autosave as a safety net (the debounced save above handles
  // answer changes). This interval is stable — it reads the latest state via
  // refs so it doesn't reset every second when `timeLeft` changes.
  const stateRef = useRef({ answers, flagged, timeLeft, currentIdx })
  stateRef.current = { answers, flagged, timeLeft, currentIdx }
  useEffect(() => {
    const interval = setInterval(() => {
      const { answers: a, flagged: f, timeLeft: tl, currentIdx: ci } = stateRef.current
      const snapshot = JSON.stringify({
        answers: a,
        flagged: Array.from(f),
        timeLeftSec: tl,
        currentIdx: ci,
      })
      if (snapshot === lastAutosaveRef.current) return
      lastAutosaveRef.current = snapshot
      fetch(`/api/exams/attempt/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: snapshot,
      }).catch(() => { /* non-fatal */ })
    }, 30000)
    return () => clearInterval(interval)
  }, [attemptId])

  // Timer — drift-free. Recompute `timeLeft` from the absolute deadline on
  // each tick so background-tab throttling can't lose time.
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    tick()
    const t = setInterval(tick, 1000)
    const onVis = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // Auto-submit when time runs out.
  useEffect(() => {
    if (timeLeft === 0 && !submitting) {
      submitExam()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const clearAutosave = () => {
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }

  const submitExam = async () => {
    if (submitting) return
    setSubmitting(true)
    const durationMs = Date.now() - startedAtRef.current

    try {
      const res = await fetch(`/api/exams/attempt/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          flagged: Array.from(flagged),
          durationMs,
        }),
      })
      const data = await res.json()

      // 409 Conflict — the attempt was already submitted (e.g. double-click,
      // or another tab submitted it). Fetch the locked review so the user
      // still sees their results.
      if (res.status === 409 || (data.error && data.error.code === 'CONFLICT')) {
        toast.info('This exam was already submitted — showing your results.')
        try {
          const getRes = await fetch(`/api/exams/attempt/${attemptId}`)
          const getData = await getRes.json()
          if (getData.ok) {
            const locked = getData.data as ExamAttemptLockedResponse
            const result: ExamSubmitResponse = {
              attemptId: locked.attemptId,
              status: 'locked',
              review: locked.review,
              score: locked.score,
              maxScore: locked.maxScore,
              correctCount: locked.correctCount,
              totalQuestions: locked.totalQuestions,
              negativeMarks: locked.negativeMarks,
              durationMs: locked.durationMs,
              xpAwarded: 0,
              xpAlreadyAwarded: true,
              totalXp: 0,
            }
            clearAutosave()
            onComplete(result)
            return
          }
        } catch {
          // fall through to error toast
        }
        toast.error('Could not retrieve your submitted exam. Please try again.')
        setSubmitting(false)
        return
      }

      if (!data.ok) {
        toast.error(data.error?.message || 'Could not submit exam.')
        setSubmitting(false)
        return
      }

      const result = data.data as ExamSubmitResponse
      if (result.xpAwarded > 0) addXp(result.xpAwarded)
      clearAutosave()
      onComplete(result)
    } catch {
      toast.error('Network error — your answers are saved. Try submitting again.')
    } finally {
      setSubmitting(false)
    }
  }

  const q = questions[currentIdx]
  const opts = q?.options ?? []
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const answeredCount = Object.keys(answers).filter((k) => answers[k]).length

  // Distraction-free full-screen overlay. Mascots are hidden when the user has
  // the "hide mascots in exams" preference on (audit fix).
  const hideMascots = pref.hideMascotsInExams

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-2 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{currentIdx + 1} / {questions.length}</Badge>
            <Badge variant="outline">{answeredCount} answered</Badge>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm',
            timeLeft < 60 ? 'bg-destructive/10 text-destructive' : 'bg-muted',
          )} aria-live="polite">
            <Clock className="h-4 w-4" />
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
            Submit
          </Button>
        </div>
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-1" />

        {/* Question palette */}
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrentIdx(i)}
              className={cn(
                'h-8 w-8 rounded text-xs font-medium border-2 transition-all',
                i === currentIdx && 'border-primary bg-primary text-primary-foreground',
                answers[qq.id] && i !== currentIdx && 'border-success/40 bg-success/10',
                flagged.has(qq.id) && 'border-amber-500',
                !answers[qq.id] && !flagged.has(qq.id) && i !== currentIdx && 'border-border',
              )}
              aria-label={`Go to question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        {q && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <p className="text-base font-medium leading-relaxed">{q.question}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-meta capitalize">{q.difficulty}</Badge>
                    <Badge variant="outline" className="text-meta">{q.marks} marks</Badge>
                    {q.negativeMark > 0 && (
                      <Badge variant="outline" className="text-meta text-destructive">-{q.negativeMark}</Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const f = new Set(flagged)
                    if (f.has(q.id)) f.delete(q.id); else f.add(q.id)
                    setFlagged(f)
                  }}
                  className={cn('gap-1 shrink-0', flagged.has(q.id) && 'text-amber-500')}
                >
                  <Flag className="h-3.5 w-3.5" /> {flagged.has(q.id) ? 'Flagged' : 'Flag'}
                </Button>
              </div>
              <div className="space-y-2">
                {opts.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setAnswers({ ...answers, [q.id]: String(i) })}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3',
                      answers[q.id] === String(i) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30',
                    )}
                  >
                    <span className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                      answers[q.id] === String(i) ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    )}>{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm">{opt}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Nav */}
        <div className="flex gap-2">
          <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)} className="flex-1">Previous</Button>
          {currentIdx + 1 < questions.length ? (
            <Button onClick={() => setCurrentIdx((i) => i + 1)} className="flex-1">Next</Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} className="flex-1 gap-2">
              <CheckCircle2 className="h-4 w-4" /> Submit
            </Button>
          )}
        </div>

        {!hideMascots && (
          <p className="text-xs text-muted-foreground text-center italic">
            Stay focused — you can flag questions for review and revisit them before submitting.
          </p>
        )}
      </div>

      {/* Submit confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>
              You&apos;ve answered {answeredCount} of {questions.length} questions.
              {answeredCount < questions.length && ' Unanswered questions will be marked as skipped.'}
              {' '}This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { clearAutosave(); onExit() }}>
              Exit without submitting
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep Working</Button>
            <Button onClick={() => { setConfirmOpen(false); submitExam() }} disabled={submitting} className="gap-2">
              {submitting ? 'Submitting…' : <>Submit Now <ChevronRight className="h-4 w-4" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Results screen — renders the server-scored review[] with explanations.
// ---------------------------------------------------------------------------

function ExamResults({ result, onBack }: { result: ExamSubmitResponse; onBack: () => void }) {
  const { pref } = usePrefs()
  const { pushMascotToast } = useAppStore()
  const review = result.review
  const correct = review.filter((r) => r.isCorrect).length
  const wrong = review.filter((r) => !r.isCorrect && r.answer).length
  const skipped = review.filter((r) => !r.answer).length
  const total = review.length
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0
  const maxScore = result.maxScore || total
  const pct = maxScore > 0 ? Math.round((result.score / maxScore) * 100) : 0
  const goodScore = accuracy >= 60

  useEffect(() => {
    pushMascotToast({
      mascot: 'leo',
      state: goodScore ? 'achievement' : 'try-again',
      message: `Exam complete! ${correct}/${total} correct, +${result.xpAwarded} XP.`,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pieData = [
    { name: 'Correct', value: correct, color: '#10b981' },
    { name: 'Wrong', value: wrong, color: '#ef4444' },
    { name: 'Skipped', value: skipped, color: '#94a3b8' },
  ]

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <div className="p-6 text-center bg-gradient-to-br from-primary/10 to-transparent">
          {!pref.hideMascotsInExams && (
            <Mascot mascot="leo" state={goodScore ? 'achievement' : 'try-again'} size={72} className="mx-auto" />
          )}
          <h2 className="text-2xl font-bold mt-2">Exam Complete!</h2>
          <p className="text-3xl font-bold text-primary mt-2">{pct}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {result.score.toFixed(1)} / {maxScore.toFixed(1)} marks · +{result.xpAwarded} XP
            {result.xpAlreadyAwarded && ' · XP already awarded'}
          </p>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-4 gap-2 text-center">
            <Stat label="Correct" value={correct} color="text-success" />
            <Stat label="Wrong" value={wrong} color="text-destructive" />
            <Stat label="Skipped" value={skipped} color="text-muted-foreground" />
            <Stat label="Accuracy" value={`${accuracy}%`} color="text-primary" />
          </div>
          <div className="h-48 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Question-by-question review (uses server-supplied correctAnswer + explanation). */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Answer Review</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96 rounded-lg border">
            <div className="divide-y">
              {review.map((r, i) => {
                const opts = r.options ?? []
                const correctIdx = r.correctAnswer ? parseInt(r.correctAnswer, 10) : -1
                return (
                  <div key={r.questionId} className="p-3">
                    <div className="flex items-start gap-2">
                      {r.isCorrect ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      ) : r.answer ? (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">—</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{i + 1}. {r.question}</p>
                        {correctIdx >= 0 && opts[correctIdx] && (
                          <p className="text-xs text-success mt-1">
                            Correct: {opts[correctIdx]}
                          </p>
                        )}
                        {!r.isCorrect && r.answer && (
                          <p className="text-xs text-destructive mt-0.5">
                            Your answer: {opts[parseInt(r.answer, 10)] ?? r.answer}
                          </p>
                        )}
                        {r.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{r.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onBack}>Back to Setup</Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Chapter Test — creates a server-side attempt via POST /api/exams/attempt
// (mode='chapter'), supports resume via GET, runs ExamShell, then shows
// ExamResults from the submit response.
// ---------------------------------------------------------------------------

function ChapterTest() {
  const { subjects } = useAppStore()
  const [phase, setPhase] = useState<ExamPhase>('setup')
  const [subjectId, setSubjectId] = useState('')
  const [selectedUnits, setSelectedUnits] = useState<number[]>([])
  const [difficulty, setDifficulty] = useState('all')
  const [count, setCount] = useState(10)
  const [duration, setDuration] = useState(15)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ExamQuestionDTO[]>([])
  const [resumeState, setResumeState] = useState<{
    answers?: Record<string, string>
    flagged?: string[]
    timeLeftSec?: number
    currentIdx?: number
  }>({})
  const [result, setResult] = useState<ExamSubmitResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const subject = subjects.find((s) => s.id === subjectId)

  const storageKey = subjectId ? `lernio-exam-chapter_test-${subjectId}` : ''

  const start = async () => {
    if (!subjectId || selectedUnits.length === 0 || !storageKey) return
    setLoading(true)
    try {
      // 1. Resume check — if we have an in-progress attempt for this subject
      //    + mode stored locally, GET it. If it's still in_progress on the
      //    server, resume; otherwise clear and create a fresh one.
      let storedAttemptId: string | null = null
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw) as { attemptId?: string }
          storedAttemptId = parsed.attemptId ?? null
        }
      } catch {
        // corrupt local entry — ignore
      }

      if (storedAttemptId) {
        try {
          const getRes = await fetch(`/api/exams/attempt/${storedAttemptId}`)
          if (getRes.ok) {
            const getData = await getRes.json()
            if (getData.ok && getData.data?.status === 'in_progress') {
              const r = getData.data as ExamAttemptResumeResponse
              setAttemptId(r.attemptId)
              setQuestions(r.questions)
              setResumeState({
                answers: r.answers,
                flagged: r.flagged,
                timeLeftSec: r.timeLeftSec,
                currentIdx: r.currentIdx,
              })
              setResult(null)
              setPhase('exam')
              toast.info('Resumed your in-progress chapter test.')
              return
            }
          }
        } catch {
          // network blip on GET — fall through to create
        }
        // Either 404, locked, or other non-resumable state: clear the slot.
        try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
      }

      // 2. Create a new attempt — server picks + stores the question set.
      const createRes = await fetch('/api/exams/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          mode: 'chapter',
          unitNumbers: selectedUnits,
          difficulty: difficulty !== 'all' ? difficulty : undefined,
          questionCount: count,
          durationMins: duration,
        }),
      })
      const createData = await createRes.json()
      if (!createData.ok) {
        // Server may report NO_QUESTIONS if the bank is empty for this filter.
        if (createData.error?.code === 'NO_QUESTIONS') {
          toast.info('No questions match these units. Try other units or difficulty.')
        } else {
          toast.error(createData.error?.message || 'Could not start the chapter test.')
        }
        setLoading(false)
        return
      }
      const created = createData.data as ExamAttemptCreateResponse
      setAttemptId(created.attemptId)
      setQuestions(created.questions)
      setResumeState({})
      setResult(null)
      setPhase('exam')
    } catch {
      toast.error('Could not start the chapter test. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (phase === 'exam' && attemptId && questions.length > 0) {
    return (
      <ExamShell
        attemptId={attemptId}
        questions={questions}
        subjectId={subjectId}
        mode="chapter_test"
        unitNumbers={selectedUnits}
        durationMinutes={duration}
        storageKey={storageKey}
        initialAnswers={resumeState.answers}
        initialFlagged={resumeState.flagged}
        initialTimeLeftSec={resumeState.timeLeftSec}
        initialCurrentIdx={resumeState.currentIdx}
        onExit={() => {
          try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
          setPhase('setup')
          setAttemptId(null)
          setQuestions([])
          setResumeState({})
        }}
        onComplete={(r) => {
          try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
          setResult(r)
          setPhase('results')
          setAttemptId(null)
          setQuestions([])
          setResumeState({})
        }}
      />
    )
  }

  if (phase === 'results' && result) {
    return <ExamResults result={result} onBack={() => { setPhase('setup'); setResult(null) }} />
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mixed</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {subject && (
          <div>
            <Label className="text-xs">Select Units</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {subject.units.map((u) => (
                <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={selectedUnits.includes(u.number)}
                    onCheckedChange={(c) => {
                      if (c) setSelectedUnits([...selectedUnits, u.number])
                      else setSelectedUnits(selectedUnits.filter((n) => n !== u.number))
                    }}
                  />
                  <span className="text-sm">Unit {u.number}: {u.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Questions</Label>
            <Select value={String(count)} onValueChange={(v) => setCount(parseInt(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 20, 30].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Duration (min)</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{[10, 15, 20, 30, 45].map((n) => <SelectItem key={n} value={String(n)}>{n} min</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>The server scores every answer — your browser cannot inflate the result. Negative marking follows the question bank&apos;s per-question scheme.</p>
        </div>

        <Button
          onClick={start}
          disabled={!subjectId || selectedUnits.length === 0 || loading}
          className="w-full gap-2"
        >
          {loading ? 'Loading…' : <>Start Chapter Test <ChevronRight className="h-4 w-4" /></>}
        </Button>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Mock Exam — creates a server-side attempt via POST /api/exams/attempt
// (mode='mock', questionPaperId), supports resume via GET, runs ExamShell,
// then shows ExamResults from the submit response.
// ---------------------------------------------------------------------------

interface QuestionPaper {
  id: string
  title: string
  subjectId: string
  year?: number | null
  duration: number
  totalMarks: number
}

function MockExam() {
  const { subjects } = useAppStore()
  const [subjectId, setSubjectId] = useState('')
  const [papers, setPapers] = useState<QuestionPaper[]>([])
  const [activePaper, setActivePaper] = useState<QuestionPaper | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<ExamQuestionDTO[]>([])
  const [resumeState, setResumeState] = useState<{
    answers?: Record<string, string>
    flagged?: string[]
    timeLeftSec?: number
    currentIdx?: number
  }>({})
  const [result, setResult] = useState<ExamSubmitResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (subjectId) {
      fetch(`/api/exams?subjectId=${subjectId}`)
        .then((r) => r.json())
        .then((d) => setPapers(d.data || []))
        .catch(() => setPapers([]))
    } else {
      setPapers([])
    }
  }, [subjectId])

  const startMock = async (paper: QuestionPaper) => {
    setLoading(true)
    const storageKey = `lernio-exam-mock_exam-${paper.id}`
    try {
      // 1. Resume check — if there's an in-progress attempt for this paper,
      //    GET it and resume; otherwise create a fresh attempt.
      let storedAttemptId: string | null = null
      try {
        const raw = localStorage.getItem(storageKey)
        if (raw) {
          const parsed = JSON.parse(raw) as { attemptId?: string }
          storedAttemptId = parsed.attemptId ?? null
        }
      } catch {
        // corrupt local entry — ignore
      }

      if (storedAttemptId) {
        try {
          const getRes = await fetch(`/api/exams/attempt/${storedAttemptId}`)
          if (getRes.ok) {
            const getData = await getRes.json()
            if (getData.ok && getData.data?.status === 'in_progress') {
              const r = getData.data as ExamAttemptResumeResponse
              setActivePaper(paper)
              setAttemptId(r.attemptId)
              setQuestions(r.questions)
              setResumeState({
                answers: r.answers,
                flagged: r.flagged,
                timeLeftSec: r.timeLeftSec,
                currentIdx: r.currentIdx,
              })
              setResult(null)
              toast.info('Resumed your in-progress mock exam.')
              return
            }
          }
        } catch {
          // network blip on GET — fall through to create
        }
        try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
      }

      // 2. Create a new attempt — server picks + stores the question set.
      const createRes = await fetch('/api/exams/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: paper.subjectId,
          questionPaperId: paper.id,
          mode: 'mock',
        }),
      })
      const createData = await createRes.json()
      if (!createData.ok) {
        if (createData.error?.code === 'NO_QUESTIONS') {
          toast.info('No questions are seeded for this subject yet.')
        } else {
          toast.error(createData.error?.message || 'Could not start the mock exam.')
        }
        setLoading(false)
        return
      }
      const created = createData.data as ExamAttemptCreateResponse
      setActivePaper(paper)
      setAttemptId(created.attemptId)
      setQuestions(created.questions)
      setResumeState({})
      setResult(null)
    } catch {
      toast.error('Could not start the mock exam. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (activePaper && attemptId && questions.length > 0) {
    const storageKey = `lernio-exam-mock_exam-${activePaper.id}`
    return (
      <ExamShell
        attemptId={attemptId}
        questions={questions}
        subjectId={activePaper.subjectId}
        mode="mock_exam"
        durationMinutes={activePaper.duration}
        storageKey={storageKey}
        initialAnswers={resumeState.answers}
        initialFlagged={resumeState.flagged}
        initialTimeLeftSec={resumeState.timeLeftSec}
        initialCurrentIdx={resumeState.currentIdx}
        onExit={() => {
          try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
          setActivePaper(null)
          setAttemptId(null)
          setQuestions([])
          setResumeState({})
        }}
        onComplete={(r) => {
          try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
          setResult(r)
          setActivePaper(null)
          setAttemptId(null)
          setQuestions([])
          setResumeState({})
        }}
      />
    )
  }

  if (result) {
    return <ExamResults result={result} onBack={() => setResult(null)} />
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div>
          <Label className="text-xs">Select Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {papers.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-xs">Available Question Papers</Label>
            {papers.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50">
                <FileText className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.year ?? '—'} · {p.duration} min · {p.totalMarks} marks
                  </p>
                </div>
                <Button size="sm" onClick={() => startMock(p)} disabled={loading}>
                  {loading ? 'Loading…' : 'Start'}
                </Button>
              </div>
            ))}
          </div>
        ) : subjectId ? (
          <div className="text-center py-6 text-sm text-muted-foreground">No question papers available for this subject yet.</div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">Select a subject to view available mock exams.</div>
        )}

        <div className="rounded-lg bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>Mock exams simulate real exam conditions: timer, no hints, server-side autosave (your progress survives a refresh), flag for review, submit confirmation. Mascots are hidden during the exam when your preference is on.</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Question Analysis — unchanged (reads paper.analysis JSON, displays charts).
// ---------------------------------------------------------------------------

interface QuestionPaperRow {
  id: string
  title: string
  subjectId: string
  year?: number | null
  duration: number
  totalMarks: number
  analysis?: string | null
}

function QuestionAnalysis() {
  const { subjects } = useAppStore()
  const [subjectId, setSubjectId] = useState('')
  const [papers, setPapers] = useState<QuestionPaperRow[]>([])

  useEffect(() => {
    if (subjectId) fetch(`/api/exams?subjectId=${subjectId}`).then((r) => r.json()).then((d) => setPapers(d.data || []))
  }, [subjectId])

  const subject = subjects.find((s) => s.id === subjectId)
  const analysis = papers[0]?.analysis ? JSON.parse(papers[0].analysis) : null

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <Label className="text-xs">Select Subject for Analysis</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
      </Card>

      {analysis && subject && (
        <>
          <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Pattern-based preparation guidance, not a guarantee of examination questions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Unit Weightage</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subject.units.map((u) => ({ name: `U${u.number}`, weightage: u.weightage }))}>
                      <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
                      <Bar dataKey="weightage" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Repeated Topics</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-56">
                  <div className="space-y-2">
                    {(analysis.repeatedTopics || []).map((t: { topic?: string; count?: number } | string, i: number) => {
                      const topic = typeof t === 'string' ? t : (t.topic || '')
                      const count = typeof t === 'object' && t ? t.count : undefined
                      return (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="flex-1">{topic}</span>
                          {count && <Badge variant="secondary">{count}×</Badge>}
                        </div>
                      )
                    })}
                    {!analysis.repeatedTopics && <p className="text-sm text-muted-foreground">No topic frequency data.</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Common Question Styles</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(analysis.questionStyles || ['Definitions', 'Short answer', 'Long answer', 'Programs', 'Diagrams']).map((s: string, i: number) => (
                    <Badge key={i} variant="outline">{s}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Important Programs</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  <div className="space-y-1.5">
                    {(analysis.commonPrograms || []).map((p: string, i: number) => (
                      <div key={i} className="text-sm flex items-start gap-2"><span className="text-primary">•</span> {p}</div>
                    ))}
                    {!analysis.commonPrograms?.length && <p className="text-sm text-muted-foreground">No program data.</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Answer Evaluator — POSTs { questionId, studentAnswer, maxMarks } to
// /api/exams/evaluate and renders the structured rubric result with safe
// ReactMarkdown (no dangerouslySetInnerHTML — AI-1 fixed the XSS).
// ---------------------------------------------------------------------------

function AnswerEvaluator() {
  const { subjects } = useAppStore()
  const [subjectId, setSubjectId] = useState('')
  const [questionId, setQuestionId] = useState('')
  const [questions, setQuestions] = useState<ExamQuestionDTO[]>([])
  const [answer, setAnswer] = useState('')
  const [maxMarks, setMaxMarks] = useState<number | ''>(5)
  const [evaluating, setEvaluating] = useState(false)
  const [result, setResult] = useState<EvaluationResult | null>(null)

  // Load questions for the selected subject so the student can pick one with a
  // real rubric (long-answer / short-answer). Server loads the question by ID,
  // so we never trust client-supplied question text.
  useEffect(() => {
    if (subjectId) {
      fetch(`/api/questions?subjectId=${subjectId}&mode=exam&limit=100`)
        .then((r) => r.json())
        .then((d) => {
          const qs: ExamQuestionDTO[] = (d.data || []).filter(
            (q: ExamQuestionDTO) => q.type === 'long_answer' || q.type === 'short_answer',
          )
          setQuestions(qs)
          setQuestionId('')
        })
        .catch(() => setQuestions([]))
    } else {
      setQuestions([])
    }
  }, [subjectId])

  const evaluate = async () => {
    if (!answer.trim() || !questionId) return
    setEvaluating(true)
    setResult(null)
    try {
      const res = await fetch('/api/exams/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          studentAnswer: answer,
          maxMarks: typeof maxMarks === 'number' ? maxMarks : undefined,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Evaluation failed.')
        setEvaluating(false)
        return
      }
      setResult(data.data as EvaluationResult)
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setEvaluating(false)
    }
  }

  // Safe react-markdown component map (no dangerouslySetInnerHTML — AI-1 fix).
  // Typed loosely as `any` for props because react-markdown's component props
  // are complex; we only render trusted AI output here.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const markdownComponents: Record<string, any> = {
    pre: ({ children }: any) => (
      <pre className="my-3 rounded-lg bg-zinc-900 dark:bg-black/60 border border-zinc-800 dark:border-zinc-800 p-3 overflow-x-auto text-xs">
        {children}
      </pre>
    ),
    code: ({ className, children, ...props }: any) => {
      const isBlock = /language-/.test(className || '')
      if (isBlock) {
        return (
          <code className={cn('font-mono text-zinc-100', className)} {...props}>{children}</code>
        )
      }
      return (
        <code className="font-mono bg-muted text-foreground px-1.5 py-0.5 rounded text-[0.85em]" {...props}>{children}</code>
      )
    },
    a: ({ children, ...props }: any) => (
      <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer noopener" {...props}>{children}</a>
    ),
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Question (from bank)</Label>
              <Select value={questionId} onValueChange={setQuestionId} disabled={!subjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={subjectId ? 'Select question' : 'Pick subject first'} /></SelectTrigger>
                <SelectContent>
                  {questions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.question.slice(0, 80)}{q.question.length > 80 ? '…' : ''} ({q.marks} marks)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {questions.length === 0 && subjectId && (
            <p className="text-xs text-muted-foreground italic">
              No long/short-answer questions are seeded for this subject yet — pick another subject to try the evaluator.
            </p>
          )}

          <div>
            <Label className="text-xs">Your Answer</Label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your exam answer here. The AI evaluator loads the question server-side and grades against a rubric."
              className="mt-1 w-full min-h-32 rounded-lg border border-input bg-background p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-xs shrink-0">Max marks (optional)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="w-24"
            />
            <p className="text-meta text-muted-foreground">
              The server prefers the question bank&apos;s marks — your value is only used as a fallback.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="h-3.5 w-3.5" />
            Evaluation criteria: concept correctness, required points, keywords, structure, clarity, marks allocation.
          </div>

          <Button
            onClick={evaluate}
            disabled={!answer.trim() || !questionId || evaluating}
            className="w-full gap-2"
          >
            {evaluating ? (
              <><Mascot mascot="leo" state="thinking" size={20} animated /> Evaluating…</>
            ) : (
              <><PenLine className="h-4 w-4" /> Evaluate Answer</>
            )}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <Mascot mascot="leo" state="explaining" size={32} animated={false} />
              <CardTitle className="text-sm">Evaluation Result</CardTitle>
              <Badge variant="secondary">{result.estimateLabel}</Badge>
              {result.usedFallback && <Badge variant="outline" className="text-amber-600">fallback</Badge>}
              <Badge variant="outline" className="ml-auto">
                {result.estimatedMarks} / {typeof maxMarks === 'number' ? maxMarks : '?'} marks
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Criterion scores */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(result.criterionScores || {}).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted/50 p-2 text-center">
                  <p className="text-lg font-bold text-primary">{(v as number).toFixed(1)}</p>
                  <p className="text-meta text-muted-foreground capitalize">{k}</p>
                </div>
              ))}
            </div>

            {/* Correct / missing / incorrect points */}
            {result.correctPoints?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-success flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Correct points
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  {result.correctPoints.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.missingPoints?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Missing points
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  {result.missingPoints.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {result.incorrectClaims?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-1">
                  <XCircle className="h-3.5 w-3.5" /> Incorrect claims
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                  {result.incorrectClaims.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}

            {/* Structure feedback + suggested improved answer (safe markdown) */}
            {result.structureFeedback && (
              <div>
                <p className="text-xs font-semibold mb-1">Structure feedback</p>
                <div className="lesson-prose prose prose-sm max-w-none text-sm">
                  <ReactMarkdown components={markdownComponents}>
                    {result.structureFeedback}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            {result.suggestedImprovedAnswer && (
              <div>
                <p className="text-xs font-semibold mb-1">Suggested improved answer</p>
                <div className="lesson-prose prose prose-sm max-w-none text-sm">
                  <ReactMarkdown components={markdownComponents}>
                    {result.suggestedImprovedAnswer}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            <Separator className="my-3" />
            <p className="text-xs text-muted-foreground italic">
              AI marks are estimates. Teacher marks override AI.
              {result.usedFallback && ' The evaluator could not reach the AI service — this is a safe fallback result.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small reusable stat cell.
// ---------------------------------------------------------------------------

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg bg-muted/50 p-2">
      <p className={cn('text-lg font-bold', color)}>{value}</p>
      <p className="text-meta text-muted-foreground">{label}</p>
    </div>
  )
}
