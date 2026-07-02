'use client'

import { useState } from 'react'
import { RotateCw, ChevronRight, ChevronLeft, BookOpen } from 'lucide-react'

interface SubjectInfo { code: string; name: string; coverageFocus: string }

export function RevisionClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)

  const subject = subjects.find(s => s.code === selected)
  if (!subject) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Choose a Subject to Revise</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {subjects.map(s => {
            const concepts = s.coverageFocus.split(/[,.]/).map(c => c.trim()).filter(c => c.length > 3).slice(0, 6)
            return (
              <button key={s.code} onClick={() => { setSelected(s.code); setCardIndex(0); setFlipped(false) }} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/5">
                <div className="min-w-0"><p className="text-[10px] font-semibold uppercase text-muted-foreground">{s.code}</p><h3 className="mt-1 text-sm font-medium">{s.name}</h3><p className="mt-1 text-xs text-muted-foreground">{concepts.length} revision cards</p></div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10"><BookOpen className="h-4 w-4 text-primary" /></div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const concepts = subject.coverageFocus.split(/[,.]/).map(c => c.trim()).filter(c => c.length > 3).slice(0, 6)
  const card = concepts[cardIndex]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back to Subjects</button>
        <span className="text-sm text-muted-foreground">Card {cardIndex + 1} / {concepts.length}</span>
      </div>

      {/* Flashcard */}
      <div className="mb-4" onClick={() => setFlipped(!flipped)}>
        <div className={`relative h-64 cursor-pointer rounded-xl border-2 transition-all duration-300 ${flipped ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
          <div className="flex h-full items-center justify-center p-6 text-center">
            {flipped ? (
              <div>
                <p className="text-xs font-semibold uppercase text-primary mb-2">Answer</p>
                <p className="text-sm text-muted-foreground">{card} — review your lesson notes and YouTube lectures for detailed explanation of this topic.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Topic</p>
                <p className="text-lg font-bold">{card}</p>
                <p className="mt-2 text-xs text-muted-foreground">Click to flip</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button onClick={() => { setCardIndex(Math.max(0, cardIndex - 1)); setFlipped(false) }} disabled={cardIndex === 0} className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent">
          <ChevronLeft className="h-4 w-4" /> Previous
        </button>
        <button onClick={() => setFlipped(!flipped)} className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <RotateCw className="h-4 w-4" /> Flip
        </button>
        <button onClick={() => { setCardIndex(Math.min(concepts.length - 1, cardIndex + 1)); setFlipped(false) }} disabled={cardIndex === concepts.length - 1} className="flex items-center gap-1 rounded-md border border-border px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-accent">
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">{subject.name} · {subject.code}</p>
    </div>
  )
}
