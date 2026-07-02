'use client'

import { useState } from 'react'
import { FileText, Clock, PlayCircle, CheckCircle2, XCircle, RotateCw, Award } from 'lucide-react'

interface SubjectInfo { code: string; name: string; credits: number; quizCount: number; coverageFocus: string }

type Mode = 'practice' | 'chapter_test' | 'mock_exam'

export function ExamsClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('practice')
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const startExam = async (subjectCode: string) => {
    setLoading(true)
    setError('')
    try {
      const subject = subjects.find(s => s.code === subjectCode)
      const res = await fetch(`/api/quiz/generate?subject=${subjectCode}&count=${mode === 'mock_exam' ? 20 : mode === 'chapter_test' ? 10 : 5}&name=${encodeURIComponent(subject?.name ?? subjectCode)}&coverage=${encodeURIComponent(subject?.coverageFocus ?? '')}`)
      const data = await res.json()
      const qs = data?.data?.questions ?? data?.questions ?? []
      if (!res.ok || qs.length === 0) {
        setError(data?.error ?? 'No quiz questions available for this subject.')
        setLoading(false)
        return
      }
      setQuestions(qs)
      setSelectedSubject(subjectCode)
      setCurrentQ(0)
      setAnswers({})
      setShowResults(false)
    } catch {
      setError('Failed to load quiz. Please try again.')
    }
    setLoading(false)
  }

  const selectAnswer = (qIndex: number, aIndex: number) => {
    setAnswers({ ...answers, [qIndex]: aIndex })
  }

  const finishExam = () => setShowResults(true)

  const reset = () => { setSelectedSubject(null); setQuestions([]); setAnswers({}); setShowResults(false); setCurrentQ(0) }

  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0)
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0

  const modes: { key: Mode; label: string; desc: string; icon: typeof FileText; count: number }[] = [
    { key: 'practice', label: 'Practice', desc: '5 questions, untimed', icon: PlayCircle, count: 5 },
    { key: 'chapter_test', label: 'Chapter Test', desc: '10 questions, 15 min', icon: Clock, count: 10 },
    { key: 'mock_exam', label: 'Mock Exam', desc: '20 questions, 3 hours', icon: FileText, count: 20 },
  ]

  // Results screen
  if (showResults) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <Award className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-3 text-xl font-bold">Exam Complete!</h2>
        <p className="mt-1 text-3xl font-bold text-primary">{percentage}%</p>
        <p className="text-sm text-muted-foreground">You scored {score} out of {questions.length}</p>
        <div className="mt-6 space-y-3 text-left">
          {questions.map((q, i) => (
            <div key={i} className={`rounded-md border p-3 ${answers[i] === q.answer ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
              <p className="text-sm font-medium">{i + 1}. {q.question}</p>
              <p className="mt-1 text-xs text-muted-foreground">Your answer: {q.options[answers[i]] ?? 'Not answered'}</p>
              {answers[i] !== q.answer && <p className="text-xs text-green-600">Correct: {q.options[q.answer]}</p>}
              <p className="mt-1 text-xs text-muted-foreground italic">{q.explanation}</p>
            </div>
          ))}
        </div>
        <button onClick={reset} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Back to Subjects</button>
      </div>
    )
  }

  // Exam in progress
  if (selectedSubject && questions.length > 0) {
    const q = questions[currentQ]
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{subjects.find(s => s.code === selectedSubject)?.name}</p>
            <p className="text-sm font-semibold capitalize">{mode.replace('_', ' ')}</p>
          </div>
          <span className="text-sm text-muted-foreground">Question {currentQ + 1} / {questions.length}</span>
        </div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} /></div>
        <p className="mb-4 text-sm font-medium whitespace-pre-line">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt: string, i: number) => (
            <button key={i} onClick={() => selectAnswer(currentQ, i)} className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${answers[currentQ] === i ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/50'}`}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0} className="rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent">← Previous</button>
          {currentQ < questions.length - 1 ? (
            <button onClick={() => setCurrentQ(currentQ + 1)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Next →</button>
          ) : (
            <button onClick={finishExam} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Submit Exam</button>
          )}
        </div>
      </div>
    )
  }

  // Subject selection
  return (
    <div>
      {/* Mode selector */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {modes.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} className={`rounded-lg border p-4 text-left transition-colors ${mode === m.key ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5'}`}>
            <m.icon className="h-5 w-5 text-primary" />
            <h3 className="mt-2 text-sm font-semibold">{m.label}</h3>
            <p className="text-xs text-muted-foreground">{m.desc}</p>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">{error}</div>}

      {/* Subject list */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Select a Subject</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map(s => (
          <button key={s.code} onClick={() => startExam(s.code)} disabled={loading} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/5 disabled:opacity-50">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{s.code}</p>
              <h3 className="mt-1 text-sm font-medium">{s.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{s.credits} credits · {s.quizCount} questions available</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              {loading ? <RotateCw className="h-4 w-4 animate-spin text-primary" /> : <PlayCircle className="h-4 w-4 text-primary" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
