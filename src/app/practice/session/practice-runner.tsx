'use client'

import { useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react'
import type { PracticeQuestion } from '@/lib/academics/practice-store'

type AnswerResult = {
  isCorrect: boolean
  correctAnswer: unknown
  solution: string
  explanation: string | null
  hint: string | null
}

function optionEntries(options: unknown): Array<{ value: string; label: string }> {
  if (!Array.isArray(options)) return []
  return options.map((option, index) => {
    if (typeof option === 'string') return { value: option, label: option }
    if (option && typeof option === 'object') {
      const row = option as Record<string, unknown>
      const value = String(row.value ?? row.id ?? row.key ?? index)
      const label = String(row.label ?? row.text ?? row.value ?? value)
      return { value, label }
    }
    return { value: String(index), label: String(option) }
  })
}

function sourceText(question: PracticeQuestion) {
  if (question.sourceType === 'PYQ') {
    return [question.sourceLabel ?? question.examType, question.sourceYear].filter(Boolean).join(' · ')
  }
  if (question.sourceType === 'AI_GENERATED') return 'Practice question · AI-generated'
  if (question.sourceType === 'ORIGINAL') return 'Lernio original practice'
  return question.sourceLabel ?? 'Practice question'
}

export function PracticeRunner({ questions, practiceMode }: { questions: PracticeQuestion[]; practiceMode: string }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState<AnswerResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [error, setError] = useState('')
  const startedAt = useRef(Date.now())

  const question = questions[index]
  const options = useMemo(() => optionEntries(question?.options), [question])
  const completed = index >= questions.length

  if (completed) {
    const accuracy = questions.length ? Math.round((correctCount / questions.length) * 100) : 0
    return (
      <section className="rounded-3xl border border-border bg-card p-7 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 text-2xl font-bold">Practice complete</h2>
        <p className="mt-2 text-muted-foreground">{correctCount} of {questions.length} correct · {accuracy}% accuracy</p>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">Your attempts are saved. Incorrect answers are available to the Mistake Notebook and mastery engine for future recommendations.</p>
        <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Practice another set</button>
      </section>
    )
  }

  async function submit() {
    if (!answer || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/practice/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          selectedAnswer: answer,
          timeTakenSeconds: Math.round((Date.now() - startedAt.current) / 1000),
          practiceMode,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save answer.')
      setResult(data)
      if (data.isCorrect) setCorrectCount((value) => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save answer.')
    } finally {
      setSubmitting(false)
    }
  }

  function next() {
    setIndex((value) => value + 1)
    setAnswer('')
    setResult(null)
    setError('')
    startedAt.current = Date.now()
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3 text-sm"><span className="font-semibold">Question {index + 1} / {questions.length}</span><span className="text-muted-foreground">{question.difficulty}</span></div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {question.estimatedTimeSeconds ? `~${Math.ceil(question.estimatedTimeSeconds / 60)} min` : 'Untimed'}</div>
      </div>

      <div className="py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.13em] text-primary">{sourceText(question)}</p>
        <h2 className="mt-3 whitespace-pre-wrap text-lg font-medium leading-8 sm:text-xl">{question.prompt}</h2>

        {options.length ? (
          <div className="mt-6 space-y-2.5">
            {options.map((option, optionIndex) => (
              <button
                type="button"
                disabled={Boolean(result)}
                key={`${option.value}-${optionIndex}`}
                onClick={() => setAnswer(option.value)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition ${answer === option.value ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/30 hover:bg-accent/40'} disabled:cursor-default`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-semibold">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="pt-0.5">{option.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6">
            <label htmlFor="practice-answer" className="text-sm font-medium">Your answer</label>
            <input id="practice-answer" disabled={Boolean(result)} value={answer} onChange={(event) => setAnswer(event.target.value)} className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-primary" placeholder="Enter your answer" />
          </div>
        )}
      </div>

      {error && <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {result && (
        <div className={`mb-5 rounded-2xl border p-5 ${result.isCorrect ? 'border-emerald-500/30 bg-emerald-500/8' : 'border-rose-500/30 bg-rose-500/8'}`}>
          <div className="flex items-center gap-2 font-semibold">{result.isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}{result.isCorrect ? 'Correct' : 'Not quite'}</div>
          {!result.isCorrect && <p className="mt-3 text-sm"><span className="font-semibold">Correct answer:</span> {Array.isArray(result.correctAnswer) ? result.correctAnswer.join(', ') : String(result.correctAnswer ?? '')}</p>}
          <div className="mt-4 border-t border-current/10 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solution</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{result.solution}</p>{result.explanation && <p className="mt-3 text-sm leading-6 text-muted-foreground">{result.explanation}</p>}</div>
        </div>
      )}

      <div className="flex justify-end">
        {!result ? (
          <button disabled={!answer || submitting} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{submitting && <Loader2 className="h-4 w-4 animate-spin" />} Check answer</button>
        ) : (
          <button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">{index === questions.length - 1 ? 'Finish' : 'Next question'} <ArrowRight className="h-4 w-4" /></button>
        )}
      </div>
    </section>
  )
}
