'use client'

import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Zap, Target, TrendingDown, Clock, CheckCircle2, XCircle, Lightbulb,
  ChevronRight, RotateCw, Brain
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { usePrefs } from '@/components/theme-provider'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Types — match the secure API DTOs (src/lib/questions.ts).
// /api/questions now returns PracticeQuestionDTO (no correctAnswer/explanation/hint).
// /api/progress POST returns the answer-side fields AFTER scoring.
// ---------------------------------------------------------------------------

interface PracticeQuestionDTO {
  id: string
  type: string
  difficulty: string
  question: string
  options: string[] | null
  marks: number
  topicId: string | null
  subjectId: string
  unitNumber: number | null
}

interface ProgressPostResponse {
  attempt: {
    id: string
    isCorrect: boolean | null
    timeTakenMs: number
    hintUsed: boolean
    confidence: number
  }
  isCorrect: boolean
  xpGain: number
  totalXp: number
  // Answer-side fields surfaced only AFTER scoring (added by BACKEND-1 + FUNC-1).
  correctAnswer: string | null
  explanation: string | null
  hint: string | null
  options: string | null
  questionType: string
}

type Mode = 'quick' | 'adaptive' | 'weak'
type Phase = 'setup' | 'quiz' | 'results'

interface AnswerRecord {
  questionId: string
  selected: string
  correct: boolean
  hintUsed: boolean
  confidence: number
  timeMs: number
  question: string
  options: string[] | null
  correctAnswer: string | null
  explanation: string | null
  xpGain: number
}

const CONFIDENCE_LABELS = ['Just guessing', 'Unsure', 'Fairly sure', 'Confident', 'Certain']

export function PracticeView() {
  const { subjects, addXp, pushMascotToast } = useAppStore()
  const { pref } = usePrefs()
  const [mode, setMode] = useState<Mode>('quick')
  const [phase, setPhase] = useState<Phase>('setup')
  const [subjectId, setSubjectId] = useState<string>('')
  const [unitNumber, setUnitNumber] = useState<string>('all')
  const [difficulty, setDifficulty] = useState<string>('all')
  const [count, setCount] = useState(10)

  // Adaptive: questions are fetched one at a time as difficulty adjusts.
  // Quick/Weak: batch-fetched up front.
  const [questions, setQuestions] = useState<PracticeQuestionDTO[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<number>(3) // 1-5
  const [showHint, setShowHint] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [serverFeedback, setServerFeedback] = useState<ProgressPostResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [questionStart, setQuestionStart] = useState(Date.now())
  const [adaptiveDifficulty, setAdaptiveDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const seenIdsRef = useRef<Set<string>>(new Set())

  const currentSubject = subjects.find((s) => s.id === subjectId)
  const currentQuestion = questions[currentIdx]

  // -------------------------------------------------------------------------
  // Start handlers
  // -------------------------------------------------------------------------

  const fetchQuestions = useCallback(
    async (params: Record<string, string>): Promise<PracticeQuestionDTO[]> => {
      const sp = new URLSearchParams(params)
      const res = await fetch(`/api/questions?${sp}`)
      const data = await res.json()
      return (data.data || []) as PracticeQuestionDTO[]
    },
    [],
  )

  const startPractice = async () => {
    if (!subjectId) return
    const params: Record<string, string> = { subjectId }
    if (unitNumber !== 'all') params.unitNumber = unitNumber
    if (mode === 'quick' && difficulty !== 'all') params.difficulty = difficulty
    if (mode === 'adaptive') params.difficulty = adaptiveDifficulty

    let qs = await fetchQuestions(params)
    if (mode !== 'adaptive') {
      qs = qs.sort(() => Math.random() - 0.5).slice(0, count)
    } else {
      // Adaptive fetches one at a time; take the first.
      qs = qs.slice(0, 1)
    }
    if (qs.length === 0) {
      toast.error('No questions found. Try different filters.')
      return
    }
    seenIdsRef.current = new Set(qs.map((q) => q.id))
    setQuestions(qs)
    setCurrentIdx(0)
    setAnswers({})
    setSelectedAnswer(null)
    setShowHint(false)
    setShowExplanation(false)
    setServerFeedback(null)
    setConfidence(3)
    setQuestionStart(Date.now())
    setPhase('quiz')
  }

  const startWeakPractice = async () => {
    if (!subjectId) return
    const progRes = await fetch('/api/progress')
    const progData = await progRes.json()
    const weak = (progData.data?.mastery || []).filter(
      (m: { state: string }) => m.state === 'weak' || m.state === 'learning',
    )
    if (weak.length === 0) {
      toast.info("You don't have any weak topics yet. Practice more to build a profile.")
      return
    }
    const topicIds = new Set(weak.map((w: { topicId: string }) => w.topicId))
    const qs = await fetchQuestions({ subjectId })
    const filtered = qs
      .filter((q) => q.topicId && topicIds.has(q.topicId))
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
    if (filtered.length === 0) {
      toast.info('No practice questions are tagged for your weak topics yet.')
      return
    }
    seenIdsRef.current = new Set(filtered.map((q) => q.id))
    setQuestions(filtered)
    setCurrentIdx(0)
    setAnswers({})
    setSelectedAnswer(null)
    setShowHint(false)
    setShowExplanation(false)
    setServerFeedback(null)
    setConfidence(3)
    setQuestionStart(Date.now())
    setPhase('quiz')
  }

  // -------------------------------------------------------------------------
  // Submit handler — sends ONLY the answer; server evaluates correctness.
  // The server returns isCorrect + correctAnswer + explanation in the same
  // response (FUNC-1 backend tweak).
  // -------------------------------------------------------------------------

  const submitAnswer = async (answer: string) => {
    if (!currentQuestion || selectedAnswer || submitting) return
    setSelectedAnswer(answer)
    setSubmitting(true)
    const timeMs = Date.now() - questionStart

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userAnswer: answer,
          timeTakenMs: timeMs,
          hintUsed: showHint,
          // confidence normalised to 0-1 (1-5 slider → 0.2..1.0).
          confidence: confidence / 5,
          context: 'practice',
          topicId: currentQuestion.topicId,
        }),
      })
      const data = await res.json()
      if (!data.ok) {
        toast.error(data.error?.message || 'Could not submit answer.')
        setSubmitting(false)
        return
      }
      const fb = data.data as ProgressPostResponse
      setServerFeedback(fb)
      if (fb.xpGain > 0) addXp(fb.xpGain)

      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selected: answer,
          correct: fb.isCorrect,
          hintUsed: showHint,
          confidence,
          timeMs,
          question: currentQuestion.question,
          options: currentQuestion.options,
          correctAnswer: fb.correctAnswer,
          explanation: fb.explanation,
          xpGain: fb.xpGain,
        },
      }))

      // Adaptive: adjust difficulty for the NEXT fetch.
      if (mode === 'adaptive') {
        setAdaptiveDifficulty((d) => {
          if (fb.isCorrect) {
            return d === 'easy' ? 'medium' : d === 'medium' ? 'hard' : 'hard'
          }
          return d === 'hard' ? 'medium' : d === 'medium' ? 'easy' : 'easy'
        })
      }

      setShowExplanation(true)
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const nextQuestion = async () => {
    if (currentIdx + 1 >= questions.length) {
      // Adaptive: optionally fetch more questions on demand; for now end the run.
      setPhase('results')
      const correctCount = Object.values(answers).filter((a) => a.correct).length
      if (correctCount > 0) {
        pushMascotToast({
          mascot: 'leo',
          state: 'achievement',
          message: `Run complete! ${correctCount} correct — keep going to level up.`,
        })
      }
      return
    }

    // Adaptive: fetch the next question at the adjusted difficulty, avoiding
    // recently-seen IDs to prevent repeats.
    if (mode === 'adaptive') {
      try {
        const params: Record<string, string> = {
          subjectId,
          difficulty: adaptiveDifficulty,
        }
        if (unitNumber !== 'all') params.unitNumber = unitNumber
        const candidates = await fetchQuestions(params)
        const fresh = candidates.filter((q) => !seenIdsRef.current.has(q.id))
        const next = fresh[0] ?? candidates[0]
        if (next) {
          seenIdsRef.current.add(next.id)
          setQuestions((prev) => [...prev, next])
        }
      } catch {
        // fall through — use whatever is in `questions` already
      }
    }

    setCurrentIdx((i) => i + 1)
    setShowHint(false)
    setShowExplanation(false)
    setSelectedAnswer(null)
    setServerFeedback(null)
    setConfidence(3)
    setQuestionStart(Date.now())
  }

  // -------------------------------------------------------------------------
  // SETUP PHASE
  // -------------------------------------------------------------------------

  if (phase === 'setup') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Mascot mascot="leo" state="greeting" size={48} />
          <div>
            <h2 className="text-lg font-bold">Practice Arena</h2>
            <p className="text-sm text-muted-foreground">
              Server-scored practice with instant feedback and adaptive difficulty.
            </p>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="quick" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Quick</TabsTrigger>
            <TabsTrigger value="adaptive" className="gap-1.5"><Brain className="h-3.5 w-3.5" /> Adaptive</TabsTrigger>
            <TabsTrigger value="weak" className="gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Weak Topics</TabsTrigger>
          </TabsList>

          {(['quick', 'adaptive', 'weak'] as const).map((m) => (
            <TabsContent key={m} value={m}>
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      {m === 'quick' && <Zap className="h-5 w-5 text-primary" />}
                      {m === 'adaptive' && <Brain className="h-5 w-5 text-primary" />}
                      {m === 'weak' && <TrendingDown className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {m === 'quick' && 'Quick Practice'}
                        {m === 'adaptive' && 'Adaptive Practice'}
                        {m === 'weak' && 'Weak Topic Practice'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {m === 'quick' && 'Answer questions at your chosen difficulty. The server scores every answer.'}
                        {m === 'adaptive' && 'Difficulty adjusts after each answer — the next question is fetched at the new level.'}
                        {m === 'weak' && 'Targeted practice on topics where your mastery is low.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Subject</Label>
                      <Select value={subjectId} onValueChange={setSubjectId}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Unit</Label>
                      <Select value={unitNumber} onValueChange={setUnitNumber}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Units</SelectItem>
                          {currentSubject?.units.map((u) => <SelectItem key={u.id} value={String(u.number)}>{u.title}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {m !== 'weak' && (
                      <div>
                        <Label className="text-xs">Difficulty</Label>
                        <Select
                          value={m === 'adaptive' ? adaptiveDifficulty : difficulty}
                          onValueChange={m === 'adaptive' ? (v) => setAdaptiveDifficulty(v as 'easy' | 'medium' | 'hard') : setDifficulty}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {m === 'quick' && <SelectItem value="all">Mixed</SelectItem>}
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Number of Questions</Label>
                      <Select value={String(count)} onValueChange={(v) => setCount(parseInt(v))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[5, 10, 15, 20].map((n) => <SelectItem key={n} value={String(n)}>{n} questions</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={m === 'weak' ? startWeakPractice : startPractice}
                    disabled={!subjectId || submitting}
                    className="w-full gap-2"
                  >
                    Start Practice <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // QUIZ PHASE
  // -------------------------------------------------------------------------

  if (phase === 'quiz' && currentQuestion) {
    const opts = currentQuestion.options ?? []
    // The verdict is whatever the SERVER returned — never a client-side comparison.
    const isCorrect = serverFeedback?.isCorrect ?? false
    const progress = ((currentIdx + 1) / questions.length) * 100
    const transition = pref.lowPower ? { duration: 0 } : { duration: 0.2 }

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Question {currentIdx + 1} of {questions.length}</Badge>
            {mode === 'adaptive' && <Badge className="bg-primary text-primary-foreground capitalize">{adaptiveDifficulty}</Badge>}
            <Badge variant="outline" className="capitalize">{currentQuestion.difficulty}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setPhase('setup')}>Exit</Button>
        </div>
        <Progress value={progress} className="h-1.5" />

        <Card>
          <CardContent className="p-5">
            <p className="text-base font-medium leading-relaxed mb-4">{currentQuestion.question}</p>
            <div className="space-y-2">
              {opts.map((opt: string, i: number) => {
                const isSelected = selectedAnswer === String(i)
                // Highlight correct/wrong only AFTER the server returns its verdict.
                const correctIdx = serverFeedback?.correctAnswer ? parseInt(serverFeedback.correctAnswer, 10) : -1
                const isCorrectOpt = serverFeedback && i === correctIdx
                return (
                  <button
                    key={i}
                    onClick={() => !selectedAnswer && submitAnswer(String(i))}
                    disabled={!!selectedAnswer}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border-2 transition-all flex items-center gap-3',
                      !selectedAnswer && 'hover:border-primary/40 hover:bg-muted/50 cursor-pointer',
                      isSelected && isCorrectOpt && 'border-success bg-success/10',
                      isSelected && !isCorrectOpt && 'border-destructive bg-destructive/10',
                      selectedAnswer && isCorrectOpt && !isSelected && 'border-success/40 bg-success/5',
                      selectedAnswer && !isCorrectOpt && !isSelected && 'border-border opacity-60',
                    )}
                  >
                    <span className={cn(
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      !selectedAnswer && 'bg-muted',
                      isSelected && isCorrectOpt && 'bg-success text-white',
                      isSelected && !isCorrectOpt && 'bg-destructive text-white',
                      selectedAnswer && isCorrectOpt && !isSelected && 'bg-success/20 text-success',
                    )}>{String.fromCharCode(65 + i)}</span>
                    <span className="text-sm flex-1">{opt}</span>
                    {selectedAnswer && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-destructive" />}
                  </button>
                )
              })}
            </div>

            {/* Confidence slider — shown AFTER selecting, BEFORE submitting feedback.
                The value is sent to the server in the POST body. */}
            {selectedAnswer && !showExplanation && (
              <div className="mt-4 rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" /> Confidence
                  </Label>
                  <span className="text-xs font-medium">{CONFIDENCE_LABELS[confidence - 1]}</span>
                </div>
                <Slider
                  value={[confidence]}
                  onValueChange={([v]) => setConfidence(v)}
                  min={1}
                  max={5}
                  step={1}
                />
                <p className="text-meta text-muted-foreground">
                  This is recorded with your attempt — it helps the platform schedule your revisions.
                </p>
              </div>
            )}

            {/* Hint — surfaced from the server's POST response (only after submit). */}
            {!showExplanation && (
              <div className="mt-4 flex items-center gap-2">
                {!showHint ? (
                  <Button variant="outline" size="sm" onClick={() => setShowHint(true)} className="gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" /> Show Hint
                  </Button>
                ) : (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-sm flex-1">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-amber-700 dark:text-amber-300">
                      Hints from the question bank are revealed after submit. For now, focus on the key concepts in the question.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Explanation — only shown after the server has scored the answer. */}
            <AnimatePresence>
              {showExplanation && serverFeedback && (
                <motion.div
                  initial={pref.lowPower ? false : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={transition}
                  className="mt-4 space-y-3"
                >
                  <div className={cn(
                    'rounded-lg p-3 border',
                    isCorrect ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30',
                  )}>
                    <div className="flex items-center gap-2 mb-1">
                      {isCorrect ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <span className="font-medium text-sm">{isCorrect ? 'Correct!' : 'Not quite right'}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        +{serverFeedback.xpGain} XP
                      </span>
                    </div>
                    {serverFeedback.explanation && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {serverFeedback.explanation}
                      </p>
                    )}
                    {serverFeedback.hint && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-2 flex items-start gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {serverFeedback.hint}
                      </p>
                    )}
                  </div>
                  <Button onClick={nextQuestion} disabled={submitting} className="w-full gap-2">
                    {currentIdx + 1 >= questions.length ? 'See Results' : 'Next Question'}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {submitting && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                <Clock className="h-3 w-3 animate-pulse" /> Scoring on the server…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // RESULTS PHASE
  // -------------------------------------------------------------------------

  if (phase === 'results') {
    const answerList = questions
      .map((q) => answers[q.id])
      .filter((a): a is AnswerRecord => !!a)
    const correctCount = answerList.filter((a) => a.correct).length
    const totalCount = answerList.length
    const accuracy = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0
    const xpEarned = answerList.reduce((sum, a) => sum + a.xpGain, 0)
    const goodScore = accuracy >= 70

    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="overflow-hidden">
          <div className={cn('p-6 text-center', goodScore ? 'bg-gradient-to-br from-success/10 to-transparent' : 'bg-gradient-to-br from-amber-500/10 to-transparent')}>
            <Mascot mascot="leo" state={goodScore ? 'achievement' : 'try-again'} size={80} className="mx-auto" />
            <h2 className="text-2xl font-bold mt-3">{goodScore ? 'Great job!' : 'Keep practicing!'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {goodScore ? 'You\'re mastering this topic.' : 'Review the explanations and try again.'}
            </p>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-2xl font-bold text-success">{correctCount}/{totalCount}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-2xl font-bold text-amber-500">+{xpEarned}</p>
                <p className="text-xs text-muted-foreground">XP Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="text-sm font-semibold mb-3">Review Answers</h3>
          <ScrollArea className="h-64 rounded-lg border">
            <div className="divide-y">
              {answerList.map((ans, i) => {
                const opts = ans.options ?? []
                const correctIdx = ans.correctAnswer ? parseInt(ans.correctAnswer, 10) : -1
                return (
                  <div key={ans.questionId} className="p-3">
                    <div className="flex items-start gap-2">
                      {ans.correct ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{i + 1}. {ans.question}</p>
                        {correctIdx >= 0 && opts[correctIdx] && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Correct: {opts[correctIdx]}
                          </p>
                        )}
                        {!ans.correct && ans.selected && (
                          <p className="text-xs text-destructive mt-0.5">
                            Your answer: {opts[parseInt(ans.selected, 10)] ?? ans.selected}
                          </p>
                        )}
                        {ans.explanation && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{ans.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setPhase('setup')}>Back to Setup</Button>
          <Button className="flex-1 gap-2" onClick={() => setPhase('setup')}>
            <RotateCw className="h-4 w-4" /> Practice Again
          </Button>
        </div>
      </div>
    )
  }

  return null
}
