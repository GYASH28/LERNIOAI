'use client'
import { useState } from 'react'
import { RotateCcw, Lightbulb } from 'lucide-react'

export function MiniFlashcard({ card }: { card: { front: string; back: string; hint?: string } }) {
  const [flipped, setFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mini-flashcard" data-flipped={flipped} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(!flipped) } }}
        aria-label={flipped ? 'Showing answer. Click to flip back.' : 'Showing question. Click to flip.'}>
        <div className="mini-flashcard__inner">
          <div className="mini-flashcard__face mini-flashcard__face--front"><div><p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Q</p><p>{card.front}</p></div></div>
          <div className="mini-flashcard__face mini-flashcard__face--back"><div><p className="text-[10px] uppercase tracking-wide text-primary mb-1">A</p><p>{card.back}</p></div></div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <button onClick={(e) => { e.stopPropagation(); setFlipped(!flipped) }} className="flex items-center gap-1 hover:text-foreground" type="button"><RotateCcw className="h-3 w-3"/>Flip</button>
        {card.hint && <button onClick={(e) => { e.stopPropagation(); setShowHint(!showHint) }} className="flex items-center gap-1 hover:text-foreground" type="button"><Lightbulb className="h-3 w-3"/>{showHint ? 'Hide hint' : 'Hint'}</button>}
      </div>
      {showHint && card.hint && <p className="text-xs text-amber-600 dark:text-amber-400 italic px-1">{card.hint}</p>}
    </div>
  )
}
export function MiniFlashcardGrid({ cards }: { cards: any[] }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map((c, i) => <MiniFlashcard key={i} card={c}/>)}</div>
}
