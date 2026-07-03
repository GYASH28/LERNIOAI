'use client'

import { useState, useMemo, useEffect } from 'react'
import { RotateCw, ChevronRight, ChevronLeft, BookOpen, Brain, Zap, FileText, CheckCircle2, XCircle, Lightbulb, AlertTriangle, GraduationCap, Download, Star, Shuffle } from 'lucide-react'

interface SubjectInfo { code: string; name: string; coverageFocus: string }

interface RevisionCard {
  id: string
  type: 'concept' | 'formula' | 'question' | 'tip' | 'mistake'
  front: string
  back: string
  subject: string
  subjectName: string
  unit?: string
  difficulty?: 'easy' | 'medium' | 'hard'
}

type StudyMode = 'all' | 'concepts' | 'formulas' | 'quiz' | 'tips' | 'mistakes'

export function RevisionClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)
  const [mode, setMode] = useState<StudyMode>('all')
  const [shuffled, setShuffled] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })

  // Load known cards from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lernio-revision-known')
      if (stored) setKnownCards(new Set(JSON.parse(stored)))
    } catch {}
  }, [])

  const saveKnown = (cards: Set<string>) => {
    setKnownCards(cards)
    try { localStorage.setItem('lernio-revision-known', JSON.stringify([...cards])) } catch {}
  }

  const subject = subjects.find(s => s.code === selected)

  // Generate revision cards from subject data
  const cards = useMemo(() => {
    if (!subject) return []
    const generated: RevisionCard[] = []

    // Parse coverage focus into topics
    const topics = subject.coverageFocus.split(/[,.]/).map(t => t.trim()).filter(t => t.length > 3)

    // Generate concept cards from coverage focus
    topics.forEach((topic, i) => {
      generated.push({
        id: `${subject.code}-concept-${i}`,
        type: 'concept',
        front: topic,
        back: `${topic} is a key topic in ${subject.name}. Review your lesson notes, watch the YouTube lectures, and practice the related quiz questions to master this concept. Key areas to focus on: definitions, properties, and practical applications.`,
        subject: subject.code,
        subjectName: subject.name,
        difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard',
      })
    })

    // Generate formula cards
    const formulaKeywords = ['complexity', 'search', 'sort', 'array', 'linked list', 'stack', 'queue', 'tree', 'graph', 'pointer', 'function', 'loop', 'recursion', 'algorithm']
    topics.forEach((topic, i) => {
      const matchedFormula = formulaKeywords.find(kw => topic.toLowerCase().includes(kw))
      if (matchedFormula) {
        const formulas: Record<string, string> = {
          'complexity': 'O(n) for linear, O(log n) for binary, O(n²) for bubble sort, O(n log n) for merge sort',
          'search': 'Linear Search: O(n). Binary Search: O(log n) — requires sorted array.',
          'sort': 'Bubble: O(n²). Selection: O(n²). Insertion: O(n²). Merge: O(n log n). Quick: O(n log n) avg.',
          'array': 'Array access: O(1). Array insert/delete: O(n). Size = upper_bound - lower_bound + 1',
          'linked list': 'Insert/Delete at head: O(1). Search: O(n). Memory = data + pointer per node',
          'stack': 'Push/Pop: O(1). Top: O(1). LIFO principle. Size tracked via counter.',
          'queue': 'Enqueue/Dequeue: O(1). Front/Rear: O(1). FIFO principle.',
          'tree': 'Height of balanced BST: O(log n). Search/Insert/Delete: O(log n) balanced, O(n) skewed.',
          'graph': 'BFS: O(V+E). DFS: O(V+E). Dijkstra: O((V+E) log V).',
          'pointer': 'ptr = &variable. *ptr dereferences. ptr->member accesses struct member.',
          'function': 'Return type, name, parameters, body. Call by value vs call by reference.',
          'loop': 'for: known iterations. while: condition-based. do-while: runs at least once.',
          'recursion': 'Base case + recursive case. Each call adds to stack. T(n) = T(n-1) + O(1) for linear.',
          'algorithm': 'Time complexity: count operations. Space complexity: extra memory used.',
        }
        generated.push({
          id: `${subject.code}-formula-${i}`,
          type: 'formula',
          front: `Formula: ${topic}`,
          back: formulas[matchedFormula] || `Review the key formulas and equations related to ${topic} in your lesson notes.`,
          subject: subject.code,
          subjectName: subject.name,
          difficulty: 'medium',
        })
      }
    })

    // Generate quiz questions
    topics.forEach((topic, i) => {
      generated.push({
        id: `${subject.code}-quiz-${i}`,
        type: 'question',
        front: `Which data structure is best suited for ${topic}?`,
        back: `The answer depends on the specific use case. Review the properties of different data structures and their trade-offs in terms of time complexity, space complexity, and operational efficiency.`,
        subject: subject.code,
        subjectName: subject.name,
        difficulty: i % 2 === 0 ? 'medium' : 'hard',
      })
    })

    // Generate exam tips
    topics.forEach((topic, i) => {
      generated.push({
        id: `${subject.code}-tip-${i}`,
        type: 'tip',
        front: `Exam Tip: ${topic}`,
        back: `For exams, focus on: 1) Definitions and properties 2) Time/space complexity 3) Step-by-step execution 4) Diagrams and examples 5) Common variations and applications. Practice drawing the structure and tracing through operations.`,
        subject: subject.code,
        subjectName: subject.name,
        difficulty: 'easy',
      })
    })

    // Generate common mistakes
    topics.forEach((topic, i) => {
      generated.push({
        id: `${subject.code}-mistake-${i}`,
        type: 'mistake',
        front: `Common Mistake: ${topic}`,
        back: `Students often: 1) Forget edge cases (empty, single element) 2) Mix up time complexities 3) Confuse similar structures (stack vs queue) 4) Off-by-one errors in loops 5) Forget to free memory. Always trace through your code with a small example.`,
        subject: subject.code,
        subjectName: subject.name,
        difficulty: 'medium',
      })
    })

    return generated
  }, [subject])

  // Filter by mode
  const filteredCards = useMemo(() => {
    let result = cards
    if (mode !== 'all') {
      const typeMap: Record<StudyMode, RevisionCard['type']> = {
        concepts: 'concept',
        formulas: 'formula',
        quiz: 'question',
        tips: 'tip',
        mistakes: 'mistake',
        all: 'concept',
      }
      if (mode !== 'all') result = cards.filter(c => c.type === typeMap[mode])
    }
    if (shuffled) {
      return [...result].sort(() => Math.random() - 0.5)
    }
    return result
  }, [cards, mode, shuffled])

  // Reset when subject or mode changes
  useEffect(() => {
    setCardIndex(0)
    setFlipped(false)
    setQuizAnswer(null)
    setQuizScore({ correct: 0, total: 0 })
  }, [selected, mode, shuffled])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected) return
      if (e.key === 'ArrowRight') setCardIndex(i => Math.min(i + 1, filteredCards.length - 1))
      if (e.key === 'ArrowLeft') setCardIndex(i => Math.max(i - 1, 0))
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, filteredCards.length])

  const markKnown = (cardId: string) => {
    const updated = new Set(knownCards)
    updated.add(cardId)
    saveKnown(updated)
  }

  const markUnknown = (cardId: string) => {
    const updated = new Set(knownCards)
    updated.delete(cardId)
    saveKnown(updated)
  }

  const knownCount = filteredCards.filter(c => knownCards.has(c.id)).length
  const progressPercent = filteredCards.length > 0 ? Math.round((knownCount / filteredCards.length) * 100) : 0

  // Subject selection screen
  if (!subject) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Smart Revision System</h2>
              <p className="text-sm text-muted-foreground">Flashcards, formulas, quizzes, exam tips & common mistakes</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Choose a Subject</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map(s => {
              const topics = s.coverageFocus.split(/[,.]/).map(c => c.trim()).filter(c => c.length > 3)
              const cardCount = topics.length * 5 // concepts + formulas + quiz + tips + mistakes
              const knownForSubject = [...knownCards].filter(id => id.startsWith(s.code)).length
              const subjectProgress = cardCount > 0 ? Math.round((knownForSubject / cardCount) * 100) : 0

              return (
                <button
                  key={s.code}
                  onClick={() => setSelected(s.code)}
                  className="group rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{s.code}</p>
                      <h4 className="mt-1 text-sm font-bold">{s.name}</h4>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{s.coverageFocus}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="h-3 w-3" />
                      {cardCount} cards
                    </span>
                    {knownForSubject > 0 && (
                      <span className="flex items-center gap-1 text-green-500 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        {subjectProgress}% known
                      </span>
                    )}
                  </div>
                  {knownForSubject > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-green-500 transition-all" style={{ width: `${subjectProgress}%` }} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // No cards
  if (filteredCards.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Subjects
        </button>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No revision cards for this mode. Try "All Cards" mode.</p>
        </div>
      </div>
    )
  }

  const card = filteredCards[cardIndex]

  const typeConfig = {
    concept: { icon: BookOpen, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Concept' },
    formula: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Formula' },
    question: { icon: Brain, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Quiz' },
    tip: { icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Exam Tip' },
    mistake: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Common Mistake' },
  }

  const TypeIcon = typeConfig[card.type].icon
  const isKnown = knownCards.has(card.id)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Subjects
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {cardIndex + 1} / {filteredCards.length}
          </span>
          <span className="text-xs text-green-500 font-medium">
            {knownCount} known
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { key: 'all', label: 'All', icon: BookOpen },
          { key: 'concepts', label: 'Concepts', icon: Brain },
          { key: 'formulas', label: 'Formulas', icon: Zap },
          { key: 'quiz', label: 'Quiz', icon: GraduationCap },
          { key: 'tips', label: 'Tips', icon: Lightbulb },
          { key: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
        ] as const).map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              mode === m.key
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'border border-border bg-card hover:bg-accent/50'
            }`}
          >
            <m.icon className="h-3 w-3" />
            {m.label}
          </button>
        ))}
        <button
          onClick={() => setShuffled(s => !s)}
          className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            shuffled ? 'bg-violet-500 text-white shadow-md' : 'border border-border bg-card hover:bg-accent/50'
          }`}
        >
          <Shuffle className="h-3 w-3" />
          Shuffle
        </button>
      </div>

      {/* Flashcard */}
      <div
        className="relative min-h-[300px] cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden"
        onClick={() => setFlipped(!flipped)}
      >
        {/* Front */}
        <div className={`absolute inset-0 p-6 flex flex-col transition-opacity duration-300 ${flipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${typeConfig[card.type].bg}`}>
              <TypeIcon className={`h-3.5 w-3.5 ${typeConfig[card.type].color}`} />
              <span className={`text-xs font-bold ${typeConfig[card.type].color}`}>{typeConfig[card.type].label}</span>
            </div>
            {card.difficulty && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                card.difficulty === 'easy' ? 'bg-green-500/10 text-green-500' :
                card.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                'bg-red-500/10 text-red-500'
              }`}>
                {card.difficulty}
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg font-semibold text-center">{card.front}</p>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">Click to flip →</p>
        </div>

        {/* Back */}
        <div className={`absolute inset-0 p-6 flex flex-col transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${typeConfig[card.type].bg}`}>
              <TypeIcon className={`h-3.5 w-3.5 ${typeConfig[card.type].color}`} />
              <span className={`text-xs font-bold ${typeConfig[card.type].color}`}>Answer</span>
            </span>
            {isKnown && (
              <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                <CheckCircle2 className="h-3.5 w-3.5" /> Known
              </span>
            )}
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">{card.back}</p>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">← Click to flip back</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setCardIndex(i => Math.max(0, i - 1))}
          disabled={cardIndex === 0}
          className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>

        <div className="flex gap-2">
          {!isKnown ? (
            <button
              onClick={() => markKnown(card.id)}
              className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500 transition-all hover:bg-green-500/20"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark Known
            </button>
          ) : (
            <button
              onClick={() => markUnknown(card.id)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20"
            >
              <XCircle className="h-4 w-4" /> Mark Unknown
            </button>
          )}
        </div>

        <button
          onClick={() => setCardIndex(i => Math.min(filteredCards.length - 1, i + 1))}
          disabled={cardIndex === filteredCards.length - 1}
          className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-accent/50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Download PDF link */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Download Full Notes PDF</p>
            <p className="text-xs text-muted-foreground">{subject.name}</p>
          </div>
        </div>
        <a
          href={`/lesson-notes/${subject.code.toLowerCase()}-${subject.name.toLowerCase().replace(/&/g, 'and').replace(/\//g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')}.pdf`}
          download
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Download className="h-3.5 w-3.5" /> PDF
        </a>
      </div>

      {/* Keyboard hints */}
      <p className="text-center text-xs text-muted-foreground">
        Use ← → arrows to navigate · Space to flip · Click card to flip
      </p>
    </div>
  )
}
