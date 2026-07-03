'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import {
  RotateCw, ChevronRight, ChevronLeft, BookOpen, Brain, Zap, FileText,
  CheckCircle2, XCircle, Lightbulb, AlertTriangle, GraduationCap,
  Download, Star, Shuffle, Clock, Layers, ListChecks, Search,
  Bookmark, BookmarkCheck, Play, Pause, RotateCcw, Hash, Type, Timer
} from 'lucide-react'

interface SubjectInfo { code: string; name: string; coverageFocus: string }

type Tab = 'flashcards' | 'formulas' | 'glossary' | 'quiz' | 'summary'
type StudyMode = 'all' | 'concepts' | 'formulas' | 'quiz' | 'tips' | 'mistakes'

export function RevisionClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('flashcards')

  // Flashcard state
  const [flipped, setFlipped] = useState(false)
  const [cardIndex, setCardIndex] = useState(0)
  const [mode, setMode] = useState<StudyMode>('all')
  const [shuffled, setShuffled] = useState(false)
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set())
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set())

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  // Timer state
  const [studyTime, setStudyTime] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Search state (glossary)
  const [searchTerm, setSearchTerm] = useState('')

  // Load saved data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lernio-revision-known')
      if (stored) setKnownCards(new Set(JSON.parse(stored)))
      const storedBm = localStorage.getItem('lernio-revision-bookmarks')
      if (storedBm) setBookmarked(new Set(JSON.parse(storedBm)))
      const storedTime = localStorage.getItem('lernio-revision-time')
      if (storedTime) setStudyTime(parseInt(storedTime) || 0)
    } catch {}
  }, [])

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setStudyTime(t => {
          const newTime = t + 1
          try { localStorage.setItem('lernio-revision-time', String(newTime)) } catch {}
          return newTime
        })
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [timerRunning])

  const saveKnown = (cards: Set<string>) => {
    setKnownCards(cards)
    try { localStorage.setItem('lernio-revision-known', JSON.stringify([...cards])) } catch {}
  }

  const saveBookmarks = (cards: Set<string>) => {
    setBookmarked(cards)
    try { localStorage.setItem('lernio-revision-bookmarks', JSON.stringify([...cards])) } catch {}
  }

  const subject = subjects.find(s => s.code === selected)

  // Generate all revision data
  const revisionData = useMemo(() => {
    if (!subject) return null
    const topics = subject.coverageFocus.split(/[,.]/).map(t => t.trim()).filter(t => t.length > 3)

    const formulaMap: Record<string, { formula: string; explanation: string }> = {
      'complexity': { formula: 'O(n), O(log n), O(n²), O(n log n)', explanation: 'Linear: O(n). Binary search: O(log n). Bubble sort: O(n²). Merge sort: O(n log n).' },
      'search': { formula: 'Linear: O(n) | Binary: O(log n)', explanation: 'Linear scans all elements. Binary requires sorted array, halves search space each step.' },
      'sort': { formula: 'Bubble/Selection/Insertion: O(n²) | Merge/Quick: O(n log n)', explanation: 'Simple sorts are O(n²). Efficient sorts like merge and quick are O(n log n).' },
      'array': { formula: 'Access: O(1) | Insert/Delete: O(n)', explanation: 'Arrays allow constant-time access but linear-time insertion/deletion due to shifting.' },
      'linked list': { formula: 'Insert/Delete at head: O(1) | Search: O(n)', explanation: 'Linked lists excel at head operations but require traversal for search.' },
      'stack': { formula: 'Push/Pop/Top: O(1)', explanation: 'Stacks follow LIFO. All operations are constant time.' },
      'queue': { formula: 'Enqueue/Dequeue: O(1)', explanation: 'Queues follow FIFO. All operations are constant time.' },
      'tree': { formula: 'Balanced BST: O(log n) | Skewed: O(n)', explanation: 'Balanced trees give logarithmic operations. Skewed trees degrade to linear.' },
      'graph': { formula: 'BFS/DFS: O(V+E) | Dijkstra: O((V+E)log V)', explanation: 'Graph traversal visits all vertices and edges. Dijkstra uses priority queue.' },
      'pointer': { formula: 'ptr = &var | *ptr = value | ptr->member', explanation: 'Pointers store memory addresses. Dereference with *, access members with ->.' },
      'function': { formula: 'return_type name(params) { body }', explanation: 'Functions encapsulate code. Call by value copies, call by reference shares.' },
      'loop': { formula: 'for/while/do-while', explanation: 'for: known count. while: condition. do-while: at least once.' },
      'recursion': { formula: 'T(n) = T(n-1) + O(1) | Base case + recursive case', explanation: 'Recursion calls itself with smaller input. Must have base case to terminate.' },
      'algorithm': { formula: 'Time = operations count | Space = extra memory', explanation: 'Analyze by counting operations. Space includes auxiliary data structures.' },
      'data structure': { formula: 'Choose based on operations needed', explanation: 'Arrays for access, linked lists for insert/delete, trees for hierarchical, graphs for networks.' },
    }

    const glossaryTerms = topics.map((topic, i) => {
      const matched = Object.keys(formulaMap).find(kw => topic.toLowerCase().includes(kw))
      return {
        term: topic,
        definition: matched
          ? formulaMap[matched].explanation
          : `${topic} is a fundamental concept in ${subject.name}. It involves understanding the principles, properties, and practical applications. Study the definitions, work through examples, and practice related problems.`,
        category: matched || 'general',
      }
    })

    const formulas = topics.map((topic, i) => {
      const matched = Object.keys(formulaMap).find(kw => topic.toLowerCase().includes(kw))
      return {
        topic,
        formula: matched ? formulaMap[matched].formula : `Review formulas for ${topic}`,
        explanation: matched ? formulaMap[matched].explanation : `Key formulas for ${topic} are in your lesson notes and PDF.`,
      }
    }).filter(f => Object.keys(formulaMap).some(kw => f.topic.toLowerCase().includes(kw)))

    const quizQuestions = topics.map((topic, i) => ({
      id: `${subject.code}-q-${i}`,
      question: `Which statement about ${topic} is correct?`,
      options: [
        `${topic} has O(1) time complexity for all operations`,
        `${topic} is a fundamental concept that requires understanding of its properties and applications`,
        `${topic} is only used in theoretical computer science`,
        `${topic} was introduced in Python 3.0`,
      ],
      correctAnswer: 1,
      explanation: `${topic} is a key concept in ${subject.name}. Understanding its properties, time complexity trade-offs, and practical applications is essential for exams.`,
    }))

    return { topics, glossaryTerms, formulas, quizQuestions }
  }, [subject])

  // Generate flashcards
  const flashcards = useMemo(() => {
    if (!revisionData) return []
    const cards: any[] = []
    revisionData.topics.forEach((topic, i) => {
      cards.push({ id: `${subject!.code}-c-${i}`, type: 'concept', front: topic, back: revisionData.glossaryTerms[i].definition, difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard' })
      const matched = revisionData.formulas.find(f => f.topic === topic)
      if (matched) cards.push({ id: `${subject!.code}-f-${i}`, type: 'formula', front: `Formula: ${topic}`, back: `${matched.formula}\n\n${matched.explanation}`, difficulty: 'medium' })
      cards.push({ id: `${subject!.code}-q-${i}`, type: 'question', front: revisionData.quizQuestions[i].question, back: revisionData.quizQuestions[i].explanation, difficulty: i % 2 === 0 ? 'medium' : 'hard' })
      cards.push({ id: `${subject!.code}-t-${i}`, type: 'tip', front: `Exam Tip: ${topic}`, back: `Focus on: 1) Definitions 2) Time/space complexity 3) Step-by-step execution 4) Diagrams 5) Applications. Practice tracing through examples.`, difficulty: 'easy' })
      cards.push({ id: `${subject!.code}-m-${i}`, type: 'mistake', front: `Common Mistake: ${topic}`, back: `Students often: 1) Forget edge cases 2) Mix up complexities 3) Off-by-one errors 4) Confuse similar concepts 5) Skip boundary checks. Always trace with examples.`, difficulty: 'medium' })
    })
    return cards
  }, [revisionData, subject])

  const filteredCards = useMemo(() => {
    let result = flashcards
    if (mode !== 'all') {
      const typeMap: Record<string, string> = { concepts: 'concept', formulas: 'formula', quiz: 'question', tips: 'tip', mistakes: 'mistake' }
      result = flashcards.filter(c => c.type === typeMap[mode])
    }
    return shuffled ? [...result].sort(() => Math.random() - 0.5) : result
  }, [flashcards, mode, shuffled])

  useEffect(() => { setCardIndex(0); setFlipped(false) }, [selected, mode, shuffled, tab])

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected || tab !== 'flashcards') return
      if (e.key === 'ArrowRight') setCardIndex(i => Math.min(i + 1, filteredCards.length - 1))
      if (e.key === 'ArrowLeft') setCardIndex(i => Math.max(i - 1, 0))
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selected, tab, filteredCards.length])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const knownCount = filteredCards.filter(c => knownCards.has(c.id)).length
  const progressPercent = filteredCards.length > 0 ? Math.round((knownCount / filteredCards.length) * 100) : 0

  // SUBJECT SELECTION
  if (!subject) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Revision Center</h2>
              <p className="text-sm text-muted-foreground">Flashcards · Formula Sheets · Glossary · Quick Quiz · Summaries</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Study time: {formatTime(studyTime)}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" /> {knownCards.size} cards mastered
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Bookmark className="h-3.5 w-3.5" /> {bookmarked.size} bookmarked
            </span>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Choose a Subject to Revise</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {subjects.map(s => {
              const topics = s.coverageFocus.split(/[,.]/).map(c => c.trim()).filter(c => c.length > 3)
              const cardCount = topics.length * 5
              const knownForSubject = [...knownCards].filter(id => id.startsWith(s.code)).length
              const subjectProgress = cardCount > 0 ? Math.round((knownForSubject / cardCount) * 100) : 0
              const safeName = s.name.toLowerCase().replace(/&/g, 'and').replace(/\//g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')

              return (
                <button
                  key={s.code}
                  onClick={() => { setSelected(s.code); setTimerRunning(true) }}
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
                    <span className="flex items-center gap-1 text-muted-foreground"><Layers className="h-3 w-3" /> {topics.length} topics</span>
                    <span className="flex items-center gap-1 text-muted-foreground"><FileText className="h-3 w-3" /> {cardCount} cards</span>
                    {knownForSubject > 0 && <span className="flex items-center gap-1 text-green-500 font-medium"><CheckCircle2 className="h-3 w-3" /> {subjectProgress}%</span>}
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

  if (!revisionData) return null

  const typeConfig = {
    concept: { icon: BookOpen, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Concept' },
    formula: { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Formula' },
    question: { icon: Brain, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Quiz' },
    tip: { icon: Lightbulb, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Exam Tip' },
    mistake: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Mistake' },
  }

  const tabs = [
    { key: 'flashcards' as Tab, label: 'Flashcards', icon: Layers },
    { key: 'formulas' as Tab, label: 'Formula Sheet', icon: Zap },
    { key: 'glossary' as Tab, label: 'Glossary', icon: BookOpen },
    { key: 'quiz' as Tab, label: 'Quick Quiz', icon: GraduationCap },
    { key: 'summary' as Tab, label: 'Summary', icon: FileText },
  ]

  const safeName = subject.name.toLowerCase().replace(/&/g, 'and').replace(/\//g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={() => { setSelected(null); setTimerRunning(false) }} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Subjects
        </button>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary">
            <Timer className="h-3 w-3" /> {formatTime(studyTime)}
          </span>
          <button onClick={() => setTimerRunning(!timerRunning)} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 font-medium hover:bg-accent/50">
            {timerRunning ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
          </button>
          <span className="text-muted-foreground">{knownCards.size} mastered</span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              tab === t.key ? 'bg-primary text-primary-foreground shadow-md' : 'border border-border bg-card hover:bg-accent/50'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ════════ FLASHCARDS TAB ════════ */}
      {tab === 'flashcards' && (
        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex flex-wrap gap-1.5">
            {([
              { key: 'all' as StudyMode, label: 'All', icon: Layers },
              { key: 'concepts' as StudyMode, label: 'Concepts', icon: BookOpen },
              { key: 'formulas' as StudyMode, label: 'Formulas', icon: Zap },
              { key: 'quiz' as StudyMode, label: 'Quiz', icon: Brain },
              { key: 'tips' as StudyMode, label: 'Tips', icon: Lightbulb },
              { key: 'mistakes' as StudyMode, label: 'Mistakes', icon: AlertTriangle },
            ]).map(m => (
              <button key={m.key} onClick={() => setMode(m.key)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${mode === m.key ? 'bg-primary/15 text-primary' : 'border border-border hover:bg-accent/50'}`}>
                <m.icon className="h-3 w-3" /> {m.label}
              </button>
            ))}
            <button onClick={() => setShuffled(s => !s)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${shuffled ? 'bg-violet-500 text-white' : 'border border-border hover:bg-accent/50'}`}>
              <Shuffle className="h-3 w-3" /> Shuffle
            </button>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Card {cardIndex + 1} / {filteredCards.length}</span>
            <span className="text-green-500 font-medium">{progressPercent}% mastered</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Card */}
          {filteredCards.length > 0 && (
            <>
              <div className="relative min-h-[280px] cursor-pointer rounded-2xl border-2 transition-all duration-300 overflow-hidden" onClick={() => setFlipped(!flipped)}>
                <div className={`absolute inset-0 p-6 flex flex-col transition-opacity duration-300 ${flipped ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${typeConfig[filteredCards[cardIndex].type as keyof typeof typeConfig].bg}`}>
                      {(() => { const Icon = typeConfig[filteredCards[cardIndex].type as keyof typeof typeConfig].icon; return <Icon className={`h-3.5 w-3.5 ${typeConfig[filteredCards[cardIndex].type as keyof typeof typeConfig].color}`} /> })()}
                      <span className={`text-xs font-bold ${typeConfig[filteredCards[cardIndex].type as keyof typeof typeConfig].color}`}>{typeConfig[filteredCards[cardIndex].type as keyof typeof typeConfig].label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {bookmarked.has(filteredCards[cardIndex].id) && <BookmarkCheck className="h-4 w-4 text-amber-500" />}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${filteredCards[cardIndex].difficulty === 'easy' ? 'bg-green-500/10 text-green-500' : filteredCards[cardIndex].difficulty === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{filteredCards[cardIndex].difficulty}</span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-lg font-semibold text-center">{filteredCards[cardIndex].front}</p>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-4">Click to flip · Spacebar</p>
                </div>
                <div className={`absolute inset-0 p-6 flex flex-col transition-opacity duration-300 ${flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-primary">Answer</span>
                    {knownCards.has(filteredCards[cardIndex].id) && <span className="flex items-center gap-1 text-xs font-bold text-green-500"><CheckCircle2 className="h-3.5 w-3.5" /> Known</span>}
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-muted-foreground text-center leading-relaxed whitespace-pre-line">{filteredCards[cardIndex].back}</p>
                  </div>
                  <p className="text-center text-xs text-muted-foreground mt-4">← Click to flip back</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setCardIndex(i => Math.max(0, i - 1))} disabled={cardIndex === 0} className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-accent/50 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { const updated = new Set(bookmarked); updated.has(filteredCards[cardIndex].id) ? updated.delete(filteredCards[cardIndex].id) : updated.add(filteredCards[cardIndex].id); saveBookmarks(updated) }}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-500 transition-all hover:bg-amber-500/20">
                    {bookmarked.has(filteredCards[cardIndex].id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                  {!knownCards.has(filteredCards[cardIndex].id) ? (
                    <button onClick={() => { const updated = new Set(knownCards); updated.add(filteredCards[cardIndex].id); saveKnown(updated) }} className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500 transition-all hover:bg-green-500/20">
                      <CheckCircle2 className="h-4 w-4" /> Mark Known
                    </button>
                  ) : (
                    <button onClick={() => { const updated = new Set(knownCards); updated.delete(filteredCards[cardIndex].id); saveKnown(updated) }} className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all hover:bg-red-500/20">
                      <XCircle className="h-4 w-4" /> Unknown
                    </button>
                  )}
                </div>
                <button onClick={() => setCardIndex(i => Math.min(filteredCards.length - 1, i + 1))} disabled={cardIndex === filteredCards.length - 1} className="flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-all hover:bg-accent/50 disabled:opacity-40">
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-center text-xs text-muted-foreground">← → navigate · Space flip · Click card to flip</p>
            </>
          )}
        </div>
      )}

      {/* ════════ FORMULA SHEET TAB ════════ */}
      {tab === 'formulas' && (
        <div className="space-y-3">
          {revisionData.formulas.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No specific formulas for this subject. Check the PDF notes.</p>
            </div>
          ) : (
            revisionData.formulas.map((f, i) => (
              <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                    <Zap className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold">{f.topic}</h4>
                    <p className="mt-1 font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">{f.formula}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.explanation}</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <a href={`/lesson-notes/${subject.code.toLowerCase()}-${safeName}.pdf`} download
            className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/5">
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /><span className="text-sm font-medium">Download Full Notes PDF</span></div>
            <Download className="h-4 w-4 text-primary" />
          </a>
        </div>
      )}

      {/* ════════ GLOSSARY TAB ════════ */}
      {tab === 'glossary' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search terms..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
          {revisionData.glossaryTerms.filter(t => t.term.toLowerCase().includes(searchTerm.toLowerCase()) || t.definition.toLowerCase().includes(searchTerm.toLowerCase())).map((term, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                  <Type className="h-4 w-4 text-cyan-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold">{term.term}</h4>
                    <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-muted text-muted-foreground">{term.category}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{term.definition}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ QUICK QUIZ TAB ════════ */}
      {tab === 'quiz' && (
        <div className="space-y-4">
          {!quizSubmitted ? (
            <>
              {revisionData.quizQuestions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <p className="text-sm font-medium">{q.question}</p>
                  </div>
                  <div className="space-y-2 ml-8">
                    {q.options.map((opt, j) => (
                      <button key={j} onClick={() => setQuizAnswers({ ...quizAnswers, [i]: j })}
                        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${quizAnswers[i] === j ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent/50'}`}>
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">{String.fromCharCode(65 + j)}</span>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={() => setQuizSubmitted(true)} disabled={Object.keys(quizAnswers).length < revisionData.quizQuestions.length}
                className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                Submit Quiz ({Object.keys(quizAnswers).length}/{revisionData.quizQuestions.length} answered)
              </button>
            </>
          ) : (
            <div className="space-y-4">
              {(() => {
                const score = revisionData.quizQuestions.filter((q, i) => quizAnswers[i] === q.correctAnswer).length
                const percentage = Math.round((score / revisionData.quizQuestions.length) * 100)
                return (
                  <div className="rounded-xl border border-border bg-card p-6 text-center">
                    <GraduationCap className="mx-auto h-10 w-10 text-primary" />
                    <h3 className="mt-2 text-xl font-bold">Quiz Complete!</h3>
                    <p className="mt-1 text-3xl font-bold text-primary">{percentage}%</p>
                    <p className="text-sm text-muted-foreground">{score} / {revisionData.quizQuestions.length} correct</p>
                  </div>
                )
              })()}
              {revisionData.quizQuestions.map((q, i) => {
                const userAns = quizAnswers[i]
                const isCorrect = userAns === q.correctAnswer
                return (
                  <div key={q.id} className={`rounded-xl border p-4 ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{isCorrect ? '✓' : '✗'}</span>
                      <p className="text-sm font-medium">{q.question}</p>
                    </div>
                    <p className="ml-7 text-xs text-muted-foreground">Your answer: <span className={isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{q.options[userAns]}</span></p>
                    {!isCorrect && <p className="ml-7 text-xs text-green-600">Correct: {q.options[q.correctAnswer]}</p>}
                    <p className="ml-7 mt-1 text-xs text-muted-foreground italic">{q.explanation}</p>
                  </div>
                )
              })}
              <button onClick={() => { setQuizAnswers({}); setQuizSubmitted(false) }}
                className="w-full rounded-lg border border-border py-3 text-sm font-medium hover:bg-accent/50">
                <RotateCcw className="h-4 w-4 inline mr-1" /> Retake Quiz
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════ SUMMARY TAB ════════ */}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold mb-3">Subject Overview</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Subject Code</p><p className="font-bold">{subject.code}</p></div>
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Topics</p><p className="font-bold">{revisionData.topics.length}</p></div>
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Flashcards</p><p className="font-bold">{flashcards.length}</p></div>
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Formulas</p><p className="font-bold">{revisionData.formulas.length}</p></div>
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Quiz Questions</p><p className="font-bold">{revisionData.quizQuestions.length}</p></div>
              <div className="rounded-lg bg-muted/20 p-3"><p className="text-xs text-muted-foreground">Mastered</p><p className="font-bold text-green-500">{knownCards.size} / {flashcards.length}</p></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold mb-3">Key Topics</h3>
            <div className="space-y-2">
              {revisionData.topics.map((topic, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm">{topic}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-base font-bold mb-2">Study Tips</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">•</span> Review flashcards daily for 15 minutes</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Focus on "Common Mistakes" cards before exams</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Take the Quick Quiz after studying each topic</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Bookmark difficult cards for quick review</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Download the PDF for offline revision</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Use the formula sheet during last-minute revision</li>
            </ul>
          </div>

          <a href={`/lesson-notes/${subject.code.toLowerCase()}-${safeName}.pdf`} download
            className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Download Complete Notes PDF</p>
                <p className="text-xs text-muted-foreground">{subject.name} — full study guide with examples</p>
              </div>
            </div>
          </a>

          {/* Reset progress */}
          <button onClick={() => { saveKnown(new Set()); saveBookmarks(new Set()) }}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/5 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10">
            <RotateCcw className="h-3 w-3 inline mr-1" /> Reset Progress for This Subject
          </button>
        </div>
      )}
    </div>
  )
}
