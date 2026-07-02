'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlayCircle, CheckCircle2, XCircle, RotateCw, ChevronRight, Zap, ArrowLeft } from 'lucide-react'

interface SubjectInfo { code: string; name: string; quizCount: number; coverageFocus: string }

const PRESETS = [
  { key: 'quick', label: 'Quick (5Q)', count: 5 },
  { key: 'short', label: 'Short (10Q)', count: 10 },
  { key: 'medium', label: 'Medium (20Q)', count: 20 },
  { key: 'long', label: 'Long (35Q)', count: 35 },
  { key: 'full', label: 'Full (50Q)', count: 50 },
  { key: 'marathon', label: 'Marathon (70Q)', count: 70 },
]

export function PracticeClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [current, setCurrent] = useState(0)
  const [selectedAns, setSelectedAns] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [presetCount, setPresetCount] = useState(5)

  const start = async (code: string) => {
    setLoading(true); setError('')
    try {
      const subject = subjects.find(s => s.code === code)
      const res = await fetch(`/api/quiz/generate?subject=${code}&count=${presetCount}&name=${encodeURIComponent(subject?.name ?? code)}&coverage=${encodeURIComponent(subject?.coverageFocus ?? '')}`)
      const data = await res.json()
      const qs = data?.data?.questions ?? data?.questions ?? []
      if (!res.ok || qs.length === 0) { setError(data?.error ?? 'No questions available.'); setLoading(false); return }
      setQuestions(qs); setSelected(code); setCurrent(0); setSelectedAns(null); setShowAnswer(false); setScore(0); setDone(false)
    } catch { setError('Failed to load.') }
    setLoading(false)
  }

  const answer = (i: number) => { if (showAnswer) return; setSelectedAns(i); setShowAnswer(true); if (i === questions[current].answer) setScore(score + 1) }
  const next = () => { if (current + 1 >= questions.length) { setDone(true) } else { setCurrent(current + 1); setSelectedAns(null); setShowAnswer(false) } }
  const reset = () => { setSelected(null); setQuestions([]); setScore(0); setDone(false); setError('') }

  if (done) return (
    <div className="rounded-lg border border-border bg-card p-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
      <h2 className="mt-3 text-xl font-bold">Practice Complete!</h2>
      <p className="text-4xl font-bold text-primary">{score}/{questions.length}</p>
      <p className="text-sm text-muted-foreground">{Math.round((score / questions.length) * 100)}% correct</p>
      <div className="mt-4 flex justify-center gap-2">
        <button onClick={reset} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Back to Subjects</button>
        <button onClick={() => { reset(); setTimeout(() => start(selected!), 100) }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try Again</button>
      </div>
    </div>
  )

  if (selected && questions.length > 0) {
    const q = questions[current]
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
        {/* Exit button */}
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => { if (confirm('Leave the practice? Your progress will be lost.')) reset() }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit
          </button>
          <span className="flex items-center gap-1 text-xs font-bold text-primary"><Zap className="h-3 w-3" />Score: {score}</span>
        </div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Question {current + 1} / {questions.length}</span>
          <span className="text-xs text-muted-foreground">{subjects.find(s => s.code === selected)?.name}</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} /></div>
        <p className="mb-4 text-sm font-medium whitespace-pre-line">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt: string, i: number) => {
            const isCorrect = showAnswer && i === q.answer
            const isWrong = showAnswer && selectedAns === i && i !== q.answer
            return (
              <button key={i} onClick={() => answer(i)} disabled={showAnswer} className={`flex w-full items-center gap-2 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${isCorrect ? 'border-green-500 bg-green-500/10 text-green-700' : isWrong ? 'border-red-500 bg-red-500/10 text-red-700' : 'border-border hover:bg-accent/50'} ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {isWrong && <XCircle className="h-4 w-4 text-red-600" />}
              </button>
            )
          })}
        </div>
        {showAnswer && (
          <div className="mt-3 rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">{selectedAns === q.answer ? '✓ Correct! ' : '✗ Wrong. '}{q.explanation}</p>
            <button onClick={next} className="mt-2 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground">{current + 1 >= questions.length ? 'Finish' : 'Next →'}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Back to dashboard */}
      <div className="mb-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Preset selector */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Choose Practice Length</h2>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PRESETS.map(p => (
          <button key={p.key} onClick={() => setPresetCount(p.count)} className={`rounded-lg border p-3 text-center transition-colors ${presetCount === p.count ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-accent/5'}`}>
            <p className="text-xs font-semibold">{p.label}</p>
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">{error}</div>}

      {/* Subject list */}
      <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Select a Subject ({presetCount} questions)</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {subjects.map(s => (
          <button key={s.code} onClick={() => start(s.code)} disabled={loading} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/5 disabled:opacity-50">
            <div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-muted-foreground">{s.code}</p><h3 className="mt-1 text-sm font-medium">{s.name}</h3><p className="mt-1 text-xs text-muted-foreground">{presetCount} random questions</p></div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">{loading ? <RotateCw className="h-4 w-4 animate-spin text-primary" /> : <PlayCircle className="h-4 w-4 text-primary" />}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
