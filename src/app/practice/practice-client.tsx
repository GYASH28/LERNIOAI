'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  PlayCircle,
  RotateCw,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  updateLocalStudentState,
} from '@/components/student-os/use-local-state'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

interface SubjectInfo {
  code: string
  name: string
  quizCount: number
  coverageFocus: string
}

interface PracticeQuestion {
  question: string
  options: string[]
  answer: number
  explanation?: string
}

interface NotebookEntry {
  id: string
  type: 'note' | 'mistake' | 'formula' | 'question' | 'flashcard'
  title: string
  body: string
  answer?: string
  subject?: string
  lesson?: string
  tags: string[]
  sourceHref?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

interface MissionState {
  date: string
  completed: string[]
}

const PRESETS = [
  { key: 'quick', label: 'Quick (5Q)', count: 5 },
  { key: 'short', label: 'Short (10Q)', count: 10 },
  { key: 'medium', label: 'Medium (20Q)', count: 20 },
  { key: 'long', label: 'Long (35Q)', count: 35 },
  { key: 'full', label: 'Full (50Q)', count: 50 },
  { key: 'marathon', label: 'Marathon (70Q)', count: 70 },
] as const

export function PracticeClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [current, setCurrent] = useState(0)
  const [selectedAns, setSelectedAns] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [presetCount, setPresetCount] = useState(5)
  const [savedMistakes, setSavedMistakes] = useState(0)

  const start = async (code: string) => {
    setLoading(true)
    setLoadingCode(code)
    setError('')
    try {
      const subject = subjects.find((item) => item.code === code)
      const params = new URLSearchParams({
        subject: code,
        count: String(presetCount),
        name: subject?.name ?? code,
        coverage: subject?.coverageFocus ?? '',
      })
      const response = await fetch(`/api/quiz/generate?${params.toString()}`)
      const payload = await response.json().catch(() => null)
      const nextQuestions = (payload?.data?.questions ?? payload?.questions ?? []) as PracticeQuestion[]
      if (!response.ok || nextQuestions.length === 0) {
        setError(payload?.error?.message ?? payload?.error ?? 'No questions are available for this subject yet.')
        return
      }
      setQuestions(nextQuestions)
      setSelected(code)
      setCurrent(0)
      setSelectedAns(null)
      setShowAnswer(false)
      setScore(0)
      setSavedMistakes(0)
      setDone(false)
    } catch {
      setError('Practice could not load. Check your connection and try again.')
    } finally {
      setLoading(false)
      setLoadingCode(null)
    }
  }

  const answer = (optionIndex: number) => {
    if (showAnswer) return
    const question = questions[current]
    setSelectedAns(optionIndex)
    setShowAnswer(true)

    if (optionIndex === question.answer) {
      setScore((value) => value + 1)
      return
    }

    saveMistake(question, optionIndex)
    setSavedMistakes((value) => value + 1)
  }

  const next = () => {
    if (current + 1 >= questions.length) {
      markMissionComplete('adaptive-practice')
      setDone(true)
      return
    }
    setCurrent((value) => value + 1)
    setSelectedAns(null)
    setShowAnswer(false)
  }

  const reset = () => {
    setSelected(null)
    setQuestions([])
    setScore(0)
    setSavedMistakes(0)
    setDone(false)
    setError('')
  }

  const saveMistake = (question: PracticeQuestion, optionIndex: number) => {
    const subject = subjects.find((item) => item.code === selected)
    const context = readLearningContext()
    const now = new Date().toISOString()
    const selectedOption = question.options[optionIndex] ?? 'No answer'
    const correctOption = question.options[question.answer] ?? 'See the explanation'
    const entry: NotebookEntry = {
      id: createId(),
      type: 'mistake',
      title: shorten(`Practice mistake: ${question.question}`, 92),
      body: `${question.question}\n\nMy answer: ${selectedOption}`,
      answer: `Correct answer: ${correctOption}${question.explanation ? `\n\nWhy: ${question.explanation}` : ''}`,
      subject: subject?.name ?? selected ?? undefined,
      lesson: context.lesson ?? undefined,
      tags: ['practice', 'mistake', 'revision-due', ...(selected ? [selected.toLowerCase()] : [])],
      sourceHref: context.returnTo ?? '/practice',
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }

    updateLocalStudentState<NotebookEntry[]>(
      STUDENT_OS_STORAGE.notebook,
      [],
      (entries) => [entry, ...entries].slice(0, 500),
    )
    markMissionComplete('mistake-note')
    toast.info('Wrong answer saved to your Mistake Notebook.')
  }

  if (done) {
    const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0
    return (
      <div className="rounded-2xl border border-border bg-card p-5 text-center shadow-sm sm:p-7">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
        <h2 className="mt-3 text-xl font-black">Practice complete</h2>
        <p className="mt-1 text-4xl font-black text-primary">{score}/{questions.length}</p>
        <p className="mt-1 text-sm text-muted-foreground">{percentage}% correct</p>
        {savedMistakes > 0 && (
          <p className="mx-auto mt-3 max-w-md rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
            {savedMistakes} {savedMistakes === 1 ? 'mistake was' : 'mistakes were'} saved for Notebook review.
          </p>
        )}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent"
          >
            Choose subject
          </button>
          <button
            type="button"
            onClick={() => {
              const code = selected
              reset()
              if (code) window.setTimeout(() => void start(code), 100)
            }}
            className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Try again
          </button>
          <Link
            href="/notebook"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent"
          >
            Review mistakes
          </Link>
        </div>
      </div>
    )
  }

  if (selected && questions.length > 0) {
    const question = questions[current]
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Leave this practice set? Your current position will be lost.')) reset()
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit
          </button>
          <span className="flex items-center gap-1 text-xs font-black text-primary">
            <Zap className="h-3.5 w-3.5" /> Score {score}
          </span>
        </div>
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Question {current + 1} / {questions.length}</span>
          <span className="truncate">{subjects.find((item) => item.code === selected)?.name}</span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
        <p className="mb-4 whitespace-pre-line text-sm font-semibold leading-6">{question.question}</p>
        <div className="space-y-2">
          {question.options.map((option, optionIndex) => {
            const correct = showAnswer && optionIndex === question.answer
            const wrong = showAnswer && selectedAns === optionIndex && optionIndex !== question.answer
            return (
              <button
                key={`${current}-${optionIndex}`}
                type="button"
                onClick={() => answer(optionIndex)}
                disabled={showAnswer}
                className={`flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${correct ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-300' : wrong ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300' : 'border-border hover:bg-accent/50'} ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-black">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span className="flex-1">{option}</span>
                {correct && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {wrong && <XCircle className="h-4 w-4 text-red-600" />}
              </button>
            )
          })}
        </div>
        {showAnswer && (
          <div className="mt-3 rounded-xl bg-muted/50 p-3">
            <p className="text-xs leading-5 text-muted-foreground">
              {selectedAns === question.answer ? '✓ Correct. ' : '✗ Saved for review. '}
              {question.explanation || 'Review the correct option before moving on.'}
            </p>
            <button
              type="button"
              onClick={next}
              className="mt-3 min-h-10 rounded-xl bg-primary px-4 text-xs font-black text-primary-foreground"
            >
              {current + 1 >= questions.length ? 'Finish practice' : 'Next question →'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/learn/current"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Current lesson
        </Link>
      </div>

      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-muted-foreground">Practice length</h2>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => setPresetCount(preset.count)}
            className={`min-h-12 rounded-xl border p-2 text-center transition ${presetCount === preset.count ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card hover:bg-accent/50'}`}
          >
            <p className="text-xs font-black">{preset.label}</p>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
          {error}
        </div>
      )}

      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-muted-foreground">
        Select a subject · {presetCount} questions
      </h2>
      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm font-black">No subjects available</p>
          <p className="mt-1 text-xs text-muted-foreground">Refresh after your curriculum profile is loaded.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => {
            const loadingThis = loading && loadingCode === subject.code
            return (
              <button
                key={subject.code}
                type="button"
                onClick={() => void start(subject.code)}
                disabled={loading}
                className="flex min-h-24 items-center justify-between rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent/30 disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-wide text-primary">{subject.code}</p>
                  <h3 className="mt-1 text-sm font-black">{subject.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {subject.quizCount > 0 ? `${subject.quizCount} reviewed questions` : `${presetCount} generated questions`}
                  </p>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                  {loadingThis
                    ? <RotateCw className="h-4 w-4 animate-spin text-primary" />
                    : <PlayCircle className="h-4 w-4 text-primary" />}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function markMissionComplete(missionId: string) {
  const today = localDateKey()
  updateLocalStudentState<MissionState>(
    STUDENT_OS_STORAGE.missions,
    { date: today, completed: [] },
    (current) => {
      const completed = current.date === today ? current.completed : []
      return {
        date: today,
        completed: completed.includes(missionId) ? completed : [...completed, missionId],
      }
    },
  )
}

function readLearningContext() {
  const params = new URLSearchParams(window.location.search)
  return {
    lesson: params.get('lesson'),
    returnTo: safeInternalPath(params.get('returnTo')),
  }
}

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${performance.timeOrigin}-${performance.now()}`
}

function shorten(value: string, max: number) {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}
