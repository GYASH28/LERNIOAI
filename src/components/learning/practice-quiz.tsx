'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronRight, RotateCcw, GraduationCap } from 'lucide-react'
import type { PracticeQuestion } from '@/lib/curriculum/lesson-notes-loader'

export function PracticeQuiz({ questions }: { questions: PracticeQuestion[] }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [answers, setAnswers] = useState<number[]>([])
  const [completed, setCompleted] = useState(false)
  if (questions.length === 0) return null
  const question = questions[currentQ]
  if (!question) return null
  const handleSelect = (index: number) => { if (showResult) return; setSelectedAnswer(index); setShowResult(true); setAnswers(a => [...a, index]) }
  const handleNext = () => { if (currentQ + 1 >= questions.length) setCompleted(true); else { setCurrentQ(currentQ + 1); setSelectedAnswer(null); setShowResult(false) } }
  const handleRestart = () => { setCurrentQ(0); setSelectedAnswer(null); setShowResult(false); setAnswers([]); setCompleted(false) }
  if (completed) {
    const score = answers.reduce((s, a, i) => (a === questions[i].answer ? s + 1 : s), 0)
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-green-600"/>
        <p className="mt-3 text-lg font-bold">Quiz Complete!</p>
        <p className="text-sm text-muted-foreground">You scored <span className="font-bold text-foreground">{score}</span> / {questions.length} ({pct}%)</p>
        <button onClick={handleRestart} className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors" type="button"><RotateCcw className="h-4 w-4"/>Try Again</button>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-primary"/>Practice Quiz</h4>
        <span className="text-xs text-muted-foreground">Q{currentQ + 1} / {questions.length} · Score: {answers.filter((a, i) => a === questions[i].answer).length}</span>
      </div>
      <div className="mb-4 flex gap-1">{questions.map((_, i) => (<div key={i} className={`h-1 flex-1 rounded-full ${i < currentQ ? 'bg-primary' : i === currentQ ? 'bg-primary/50' : 'bg-muted'}`}/>))}</div>
      <p className="mb-4 text-sm font-medium whitespace-pre-line">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = selectedAnswer === i; const isCorrect = i === question.answer
          const showCorrect = showResult && isCorrect; const showWrong = showResult && isSelected && !isCorrect
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={showResult}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${showCorrect ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400' : showWrong ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400' : 'border-border hover:bg-accent/50 disabled:cursor-default'}`} type="button">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{option}</span>
              {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0"/>}
              {showWrong && <XCircle className="h-4 w-4 text-red-600 shrink-0"/>}
            </button>
          )
        })}
      </div>
      {showResult && (
        <div className="mt-3 rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{selectedAnswer === question.answer ? '✓ Correct! ' : '✗ Wrong. '}</span>{question.explanation}</p>
          <button onClick={handleNext} className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors" type="button">{currentQ + 1 >= questions.length ? 'Finish' : 'Next Question'}<ChevronRight className="h-3 w-3"/></button>
        </div>
      )}
    </div>
  )
}
