'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Clock, PlayCircle, CheckCircle2, XCircle, RotateCw, Award, Timer, ArrowLeft, Home, BookOpen } from 'lucide-react'

interface SubjectInfo { code: string; name: string; credits: number; quizCount: number; coverageFocus: string }

type Preset = 'quick' | 'short' | 'medium' | 'long' | 'full' | 'marathon'

const PRESETS: { key: Preset; label: string; count: number; timeMin: number; icon: typeof Clock; desc: string }[] = [
  { key: 'quick',    label: 'Quick Quiz',     count: 5,  timeMin: 5,   icon: PlayCircle,  desc: '5 questions · 5 min' },
  { key: 'short',    label: 'Short Test',     count: 10, timeMin: 10,  icon: Clock,       desc: '10 questions · 10 min' },
  { key: 'medium',   label: 'Chapter Test',   count: 20, timeMin: 20,  icon: FileText,    desc: '20 questions · 20 min' },
  { key: 'long',     label: 'Half Exam',      count: 35, timeMin: 45,  icon: FileText,    desc: '35 questions · 45 min' },
  { key: 'full',     label: 'Full Mock',      count: 50, timeMin: 90,  icon: Award,       desc: '50 questions · 90 min' },
  { key: 'marathon', label: 'Marathon (70Q)', count: 70, timeMin: 120, icon: Award,       desc: '70 questions · 2 hours' },
]

export function ExamsClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [preset, setPreset] = useState<Preset>('medium')
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [examStarted, setExamStarted] = useState(false)

  const currentPreset = PRESETS.find(p => p.key === preset)!

  // Timer
  useEffect(() => {
    if (!examStarted || showResults) return
    if (timeLeft <= 0) {
      setShowResults(true)
      return
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    return () => clearTimeout(timer)
  }, [examStarted, timeLeft, showResults])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const startExam = async (subjectCode: string) => {
    setLoading(true); setLoadingCode(subjectCode); setError('')
    try {
      const subject = subjects.find(s => s.code === subjectCode)
      const res = await fetch(`/api/quiz/generate?subject=${subjectCode}&preset=${preset}&name=${encodeURIComponent(subject?.name ?? subjectCode)}&coverage=${encodeURIComponent(subject?.coverageFocus ?? '')}`)
      const data = await res.json()
      const qs = data?.data?.questions ?? data?.questions ?? []
      if (!res.ok || qs.length === 0) { setError(data?.error ?? 'Failed to load.'); setLoading(false); setLoadingCode(null); return }
      setQuestions(qs)
      setSelectedSubject(subjectCode)
      setCurrentQ(0); setAnswers({}); setShowResults(false)
      setTimeLeft(currentPreset.timeMin * 60)
      setExamStarted(true)
    } catch { setError('Failed to load.') }
    setLoading(false); setLoadingCode(null)
  }

  const selectAnswer = (qIndex: number, aIndex: number) => {
    setAnswers({ ...answers, [qIndex]: aIndex })
  }

  const finishExam = () => { setShowResults(true); setExamStarted(false) }
  const reset = () => { setSelectedSubject(null); setQuestions([]); setAnswers({}); setShowResults(false); setCurrentQ(0); setExamStarted(false); setTimeLeft(0); setError('') }

  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0)
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
  const answered = Object.keys(answers).length

  // Results screen
  if (showResults) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        {/* Back button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Subjects
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>

        <div className="text-center mb-6">
          <Award className="mx-auto h-12 w-12 text-amber-500" />
          <h2 className="mt-3 text-xl font-bold">Exam Complete!</h2>
          <p className="mt-1 text-4xl font-bold text-primary">{percentage}%</p>
          <p className="text-sm text-muted-foreground">You scored {score} out of {questions.length}</p>
          <div className="mt-2 flex justify-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-4 w-4" />{score} correct</span>
            <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />{questions.length - score} wrong</span>
          </div>
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => {
            const userAns = answers[i]
            const isCorrect = userAns === q.answer
            return (
              <div key={i} className={`rounded-md border p-3 ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-start gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Your answer: <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{q.options[userAns] ?? 'Not answered'}</span></p>
                    {!isCorrect && <p className="text-xs text-green-600">Correct: {q.options[q.answer]}</p>}
                    <p className="mt-1 text-xs text-muted-foreground italic">{q.explanation}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={reset} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to Subjects</button>
          <button onClick={() => { reset(); setTimeout(() => startExam(selectedSubject!), 100) }} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Retry Exam</button>
        </div>
      </div>
    )
  }

  // Exam in progress
  if (selectedSubject && questions.length > 0) {
    const q = questions[currentQ]
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        {/* Back / exit button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Leave the exam? Your progress will be lost.')) {
                reset()
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit Exam
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
        </div>

        {/* Header with timer */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{subjects.find(s => s.code === selectedSubject)?.name}</p>
            <p className="text-sm font-semibold">{currentPreset.label} · {questions.length} questions</p>
          </div>
          <div className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold ${timeLeft < 60 ? 'bg-red-500/10 text-red-600' : 'bg-primary/10 text-primary'}`}>
            <Timer className="h-4 w-4" />{formatTime(timeLeft)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentQ + 1} / {questions.length}</span>
          <span>{answered} answered</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} /></div>

        {/* Question */}
        <p className="mb-4 text-sm font-medium whitespace-pre-line">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt: string, i: number) => (
            <button key={i} onClick={() => selectAnswer(currentQ, i)} className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${answers[currentQ] === i ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/50'}`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {answers[currentQ] === i && <CheckCircle2 className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent">← Prev</button>
          {currentQ < questions.length - 1 ? (
            <button onClick={() => setCurrentQ(currentQ + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Next →</button>
          ) : (
            <button onClick={finishExam} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Submit Exam</button>
          )}
        </div>

        {/* Quick jump grid */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setCurrentQ(i)} className={`flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold transition-colors ${i === currentQ ? 'bg-primary text-primary-foreground' : answers[i] !== undefined ? 'bg-green-500/20 text-green-700' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Subject + preset selection
  return (
    <div>
      {/* Back to dashboard button */}
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Preset selector */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Choose Exam Type</h2>
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => setPreset(p.key)} className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${preset === p.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5'}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${preset === p.key ? 'bg-primary/10' : 'bg-muted'}`}><p.icon className={`h-4 w-4 ${preset === p.key ? 'text-primary' : 'text-muted-foreground'}`} /></div>
            <div className="min-w-0"><h3 className="text-sm font-semibold">{p.label}</h3><p className="text-xs text-muted-foreground">{p.desc}</p></div>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">{error}</div>}

      {/* Subject list */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Select a Subject ({currentPreset.count} questions)</h2>
      {subjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm font-semibold">No subjects available</p>
          <p className="mt-1 text-xs text-muted-foreground">Subjects will appear here once your curriculum is loaded. Try refreshing the page.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map(s => {
            const isLoadingThis = loading && loadingCode === s.code
            return (
              <button key={s.code} onClick={() => startExam(s.code)} disabled={loading} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/5 disabled:opacity-50">
                <div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-muted-foreground">{s.code}</p><h3 className="mt-1 text-sm font-medium">{s.name}</h3><p className="mt-1 text-xs text-muted-foreground">{s.credits} credits · {s.quizCount > 0 ? `${s.quizCount} Qs available` : `${currentPreset.count} AI questions`} · {currentPreset.timeMin} min</p></div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">{isLoadingThis ? <RotateCw className="h-4 w-4 animate-spin text-primary" /> : <PlayCircle className="h-4 w-4 text-primary" />}</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
