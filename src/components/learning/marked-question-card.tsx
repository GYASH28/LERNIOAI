'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react'
import type { MarkedQuestion, Mnemonic } from '@/lib/curriculum/lesson-notes-loader'

export function MarkedQuestionCard({ q }: { q: MarkedQuestion }) {
  const [showAnswer, setShowAnswer] = useState(false)
  return (
    <div className="marked-question">
      <div className="marked-question__header">
        <span className="marked-question__badge" data-marks={q.marks}>
          {q.marks}M
        </span>
        <p className="text-sm font-medium text-foreground flex-1">{q.question}</p>
      </div>
      {q.modelAnswer && (
        <button
          onClick={() => setShowAnswer((v) => !v)}
          className="mt-1 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          type="button"
        >
          {showAnswer ? (
            <>
              <ChevronUp className="h-3 w-3" /> Hide model answer
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" /> Show model answer
            </>
          )}
        </button>
      )}
      {showAnswer && q.modelAnswer && (
        <div className="mt-2 rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
          {q.modelAnswer}
        </div>
      )}
      {q.tips && q.tips.length > 0 && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Tip: </span>
            {q.tips.join(' · ')}
          </div>
        </div>
      )}
    </div>
  )
}

export function MarkedQuestionList({ questions }: { questions: MarkedQuestion[] }) {
  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <MarkedQuestionCard key={i} q={q} />
      ))}
    </div>
  )
}

export function MnemonicCard({ m }: { m: Mnemonic }) {
  return (
    <div className="mnemonic-card">
      <span className="mnemonic-card__phrase">{m.phrase}</span>
      <span className="mnemonic-card__expansion">{m.expansion}</span>
      <span className="mnemonic-card__meaning">{m.meaning}</span>
    </div>
  )
}

export function MnemonicList({ items }: { items: Mnemonic[] }) {
  return (
    <div className="space-y-2">
      {items.map((m, i) => (
        <MnemonicCard key={i} m={m} />
      ))}
    </div>
  )
}
