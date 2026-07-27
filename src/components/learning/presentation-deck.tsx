'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Target,
  ListChecks,
  FileText,
  Lightbulb,
  Sparkles,
  GitBranch,
  Network,
  Table as TableIcon,
  Code2,
  Gauge,
  Pencil,
  AlertTriangle,
  MessageCircle,
  Briefcase,
  Award,
  Zap,
  Brain,
  ListOrdered,
  Layers,
  Bot,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Bookmark,
  BookmarkCheck,
  Printer,
  ArrowRight,
  CheckCircle2,
  Info,
  Clock,
  BarChart3,
  type LucideIcon,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MarkdownRenderer } from './markdown-renderer'
import { CodeBlock } from './code-block'
import { DiagramRenderer } from './diagram-renderer'
import { Callout } from './callout'
import { MarkedQuestionList, MnemonicList } from './marked-question-card'
import { MiniFlashcardGrid } from './mini-flashcard'
import { PracticeQuiz } from './practice-quiz'
import { AINotesToolbar } from './ai-notes-toolbar'

// ─────────────────────────────────────────────────────────────────────────────
// Slide type system
// ─────────────────────────────────────────────────────────────────────────────

type SlideType =
  | 'title'
  | 'overview'
  | 'objectives'
  | 'prerequisites'
  | 'theory'
  | 'concepts'
  | 'analogy'
  | 'diagram'
  | 'table'
  | 'code'
  | 'complexity'
  | 'worked'
  | 'mistakes'
  | 'callouts'
  | 'viva'
  | 'interview'
  | 'exam'
  | 'formulas'
  | 'summary'
  | 'cheatsheet'
  | 'mnemonics'
  | 'quiz'
  | 'flashcards'
  | 'ai-summaries'
  | 'closing'

interface Slide {
  id: string
  type: SlideType
  title: string
  icon: LucideIcon
  content: unknown // typed per slide in the renderer
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide generator — converts a Lesson into an array of slides
// ─────────────────────────────────────────────────────────────────────────────

function generateSlides(lesson: Lesson, subject: SubjectNotes): Slide[] {
  const slides: Slide[] = []
  let order = 0

  // Title slide
  slides.push({
    id: `slide-${order++}`,
    type: 'title',
    title: lesson.title,
    icon: BookOpen,
    content: { lesson, subject },
  })

  // Overview
  if (lesson.overview) {
    slides.push({
      id: `slide-${order++}`,
      type: 'overview',
      title: 'Overview',
      icon: BookOpen,
      content: lesson.overview,
    })
  }

  // Objectives
  if (lesson.objectives?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'objectives',
      title: 'Learning Objectives',
      icon: Target,
      content: lesson.objectives,
    })
  }

  // Prerequisites
  if (lesson.prerequisites?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'prerequisites',
      title: 'Prerequisites',
      icon: ListChecks,
      content: lesson.prerequisites,
    })
  }

  // Theory — split by ## headings into multiple slides
  if (lesson.theory) {
    const sections = lesson.theory.split(/^## /m).filter((s) => s.trim())
    for (const section of sections) {
      const heading = section.split('\n')[0].trim()
      const body = '## ' + section
      slides.push({
        id: `slide-${order++}`,
        type: 'theory',
        title: heading || 'Theory',
        icon: FileText,
        content: body,
      })
    }
  }

  // Key Concepts
  if (lesson.keyConcepts?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'concepts',
      title: 'Key Concepts',
      icon: Lightbulb,
      content: lesson.keyConcepts,
    })
  }

  // Analogies
  if (lesson.analogies?.length) {
    for (const analogy of lesson.analogies) {
      slides.push({
        id: `slide-${order++}`,
        type: 'analogy',
        title: 'Real-Life Analogy',
        icon: Sparkles,
        content: analogy,
      })
    }
  }

  // Flowcharts
  if (lesson.flowcharts?.length) {
    for (const fc of lesson.flowcharts) {
      slides.push({
        id: `slide-${order++}`,
        type: 'diagram',
        title: 'Flowchart',
        icon: GitBranch,
        content: fc,
      })
    }
  }

  // Mind Maps
  if (lesson.mindMaps?.length) {
    for (const mm of lesson.mindMaps) {
      slides.push({
        id: `slide-${order++}`,
        type: 'diagram',
        title: 'Mind Map',
        icon: Network,
        content: mm,
      })
    }
  }

  // Tables
  if (lesson.tables?.length) {
    for (const table of lesson.tables) {
      slides.push({
        id: `slide-${order++}`,
        type: 'table',
        title: table.title || 'Comparison Table',
        icon: TableIcon,
        content: table,
      })
    }
  }

  // Diagrams
  if (lesson.diagrams?.length) {
    for (const diag of lesson.diagrams) {
      slides.push({
        id: `slide-${order++}`,
        type: 'diagram',
        title: diag.title,
        icon: Network,
        content: diag,
      })
    }
  }

  // Code Examples
  if (lesson.codeExamples?.length) {
    for (const ex of lesson.codeExamples) {
      slides.push({
        id: `slide-${order++}`,
        type: 'code',
        title: ex.title,
        icon: Code2,
        content: ex,
      })
    }
  }

  // Complexity
  if (lesson.complexity) {
    slides.push({
      id: `slide-${order++}`,
      type: 'complexity',
      title: 'Complexity Analysis',
      icon: Gauge,
      content: lesson.complexity,
    })
  }

  // Worked Examples
  if (lesson.workedExamples?.length) {
    for (const ex of lesson.workedExamples) {
      slides.push({
        id: `slide-${order++}`,
        type: 'worked',
        title: ex.title,
        icon: Pencil,
        content: ex,
      })
    }
  }

  // Common Mistakes
  if (lesson.commonMistakes?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'mistakes',
      title: 'Common Mistakes',
      icon: AlertTriangle,
      content: lesson.commonMistakes,
    })
  }

  // Callouts
  if (lesson.callouts?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'callouts',
      title: 'Important Notes',
      icon: Info,
      content: lesson.callouts,
    })
  }

  // Formulas
  if (lesson.formulas?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'formulas',
      title: 'Key Formulas',
      icon: Zap,
      content: lesson.formulas,
    })
  }

  // Viva Questions
  if (lesson.vivaQuestions?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'viva',
      title: 'Viva Questions',
      icon: MessageCircle,
      content: lesson.vivaQuestions,
    })
  }

  // Interview Questions
  if (lesson.interviewQuestions?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'interview',
      title: 'Interview Questions',
      icon: Briefcase,
      content: lesson.interviewQuestions,
    })
  }

  // Exam Questions
  if (lesson.examQuestions?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'exam',
      title: 'Exam Questions',
      icon: Award,
      content: lesson.examQuestions,
    })
  }

  // Mnemonics
  if (lesson.mnemonics?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'mnemonics',
      title: 'Memory Tricks',
      icon: Brain,
      content: lesson.mnemonics,
    })
  }

  // Summary
  if (lesson.revisionSummary) {
    slides.push({
      id: `slide-${order++}`,
      type: 'summary',
      title: 'Revision Summary',
      icon: FileText,
      content: lesson.revisionSummary,
    })
  }

  // Cheat Sheet
  if (lesson.cheatSheet?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'cheatsheet',
      title: 'Cheat Sheet',
      icon: Zap,
      content: lesson.cheatSheet,
    })
  }

  // Quiz
  if (lesson.practiceQuestions?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'quiz',
      title: 'Practice Quiz',
      icon: ListOrdered,
      content: lesson.practiceQuestions,
    })
  }

  // Flashcards
  if (lesson.flashcards?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'flashcards',
      title: 'Flashcards',
      icon: Layers,
      content: lesson.flashcards,
    })
  }

  // AI Summaries
  if (lesson.aiSummaries?.length) {
    slides.push({
      id: `slide-${order++}`,
      type: 'ai-summaries',
      title: 'AI Summaries',
      icon: Bot,
      content: lesson.aiSummaries,
    })
  }

  // Closing slide
  slides.push({
    id: `slide-${order++}`,
    type: 'closing',
    title: 'Lesson Complete',
    icon: CheckCircle2,
    content: { lesson, subject },
  })

  return slides
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PresentationDeck component
// ─────────────────────────────────────────────────────────────────────────────

export interface PresentationDeckProps {
  lesson: Lesson
  subject: SubjectNotes
  prevHref?: string | null
  nextHref?: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}

export function PresentationDeck({
  lesson,
  subject,
  prevHref,
  nextHref,
  prevTitle,
  nextTitle,
}: PresentationDeckProps) {
  const slides = useMemo(() => generateSlides(lesson, subject), [lesson, subject])
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [showOverview, setShowOverview] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const wheelLockRef = useRef(false)
  const touchStartY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const goTo = useCallback((index: number, dir: number = 1) => {
    if (index < 0 || index >= slides.length) return
    setDirection(dir)
    setCurrent(index)
  }, [slides.length])

  const next = useCallback(() => {
    if (current < slides.length - 1) {
      goTo(current + 1, 1)
    }
  }, [current, slides.length, goTo])

  const prev = useCallback(() => {
    if (current > 0) {
      goTo(current - 1, -1)
    }
  }, [current, goTo])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0, -1)
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(slides.length - 1, 1)
      } else if (e.key === 'Escape' && showOverview) {
        setShowOverview(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [next, prev, goTo, slides.length, showOverview])

  // Wheel navigation (debounced)
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (wheelLockRef.current) return
      // Don't intercept if scrolling inside a scrollable element
      const target = e.target as HTMLElement
      if (target.closest('.slide-scrollable')) return

      if (Math.abs(e.deltaY) < 30) return
      wheelLockRef.current = true
      if (e.deltaY > 0) {
        next()
      } else {
        prev()
      }
      setTimeout(() => { wheelLockRef.current = false }, 800)
    }
    const container = containerRef.current
    if (!container) return
    container.addEventListener('wheel', handler, { passive: true })
    return () => container.removeEventListener('wheel', handler)
  }, [next, prev])

  // Touch / swipe navigation
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0]?.clientY ?? 0
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const endY = e.changedTouches[0]?.clientY ?? 0
      const diff = touchStartY.current - endY
      if (Math.abs(diff) > 50) {
        if (diff > 0) next()
        else prev()
      }
    }
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [next, prev])

  // Bookmark
  useEffect(() => {
    const key = `lernio:materials:bookmark:${subject.subjectCode}:${lesson.slug}`
    setBookmarked(typeof window !== 'undefined' && localStorage.getItem(key) === '1')
  }, [subject.subjectCode, lesson.slug])

  const toggleBookmark = () => {
    const key = `lernio:materials:bookmark:${subject.subjectCode}:${lesson.slug}`
    const nextVal = !bookmarked
    setBookmarked(nextVal)
    if (nextVal) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  }

  const progress = ((current + 1) / slides.length) * 100
  const currentSlide = slides[current]
  if (!currentSlide) return null

  return (
    <div className="presentation-deck" ref={containerRef}>
      {/* ─── Top bar: slide counter + actions ─── */}
      <div className="deck-topbar no-print">
        <div className="deck-topbar__left">
          <button
            onClick={() => setShowOverview(true)}
            className="deck-btn"
            type="button"
            aria-label="Slide overview"
          >
            <Layers className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Overview</span>
          </button>
        </div>
        <div className="deck-topbar__center">
          <span className="deck-counter">
            {current + 1} <span className="deck-counter__total">/ {slides.length}</span>
          </span>
          <span className="deck-current-title hidden md:inline">{currentSlide.title}</span>
        </div>
        <div className="deck-topbar__right">
          <button onClick={toggleBookmark} className="deck-btn" type="button" aria-label="Bookmark">
            {bookmarked ? <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> : <Bookmark className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => window.print()} className="deck-btn" type="button" aria-label="Print">
            <Printer className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setShowOverview(true)} className="deck-btn" type="button" aria-label="Search">
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ─── AI Toolbar (non-sticky, sits above slides) ─── */}
      <div className="no-print" style={{ marginBottom: '0.75rem' }}>
        <AINotesToolbar
          subjectName={subject.subjectName}
          lessonTitle={lesson.title}
          lessonOverview={lesson.overview}
        />
      </div>

      {/* ─── Slide viewport ─── */}
      <div className="slide-viewport">
        <div
          key={currentSlide.id}
          className={`slide slide--${currentSlide.type}`}
          data-direction={direction}
        >
          <SlideRenderer slide={currentSlide} lesson={lesson} subject={subject} />
        </div>
      </div>

      {/* ─── Navigation arrows ─── */}
      <button
        onClick={prev}
        disabled={current === 0}
        className="deck-nav deck-nav--prev no-print"
        type="button"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        disabled={current === slides.length - 1}
        className="deck-nav deck-nav--next no-print"
        type="button"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* ─── Bottom progress bar ─── */}
      <div className="deck-progress no-print">
        <div className="deck-progress__bar" style={{ width: `${progress}%` }} />
      </div>

      {/* ─── Dot navigation ─── */}
      <div className="deck-dots no-print">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            className={`deck-dot ${i === current ? 'deck-dot--active' : ''}`}
            type="button"
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            title={slide.title}
          >
            <span className="deck-dot__icon"><slide.icon className="h-3 w-3" /></span>
          </button>
        ))}
      </div>

      {/* ─── Overview modal ─── */}
      {showOverview && (
        <div className="deck-overview no-print" onClick={() => setShowOverview(false)}>
          <div className="deck-overview__panel" onClick={(e) => e.stopPropagation()}>
            <div className="deck-overview__header">
              <h3 className="deck-overview__title">All Slides</h3>
              <button onClick={() => setShowOverview(false)} className="deck-btn" type="button">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="deck-overview__grid">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  onClick={() => { goTo(i, i > current ? 1 : -1); setShowOverview(false) }}
                  className={`deck-overview__item ${i === current ? 'deck-overview__item--active' : ''}`}
                  type="button"
                >
                  <span className="deck-overview__number">{i + 1}</span>
                  <span className="deck-overview__icon"><slide.icon className="h-3.5 w-3.5" /></span>
                  <span className="deck-overview__label">{slide.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Keyboard hint (first slide only) ─── */}
      {current === 0 && (
        <div className="deck-hint no-print">
          <kbd>←</kbd> <kbd>→</kbd> or scroll / swipe to navigate
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide renderer — switches on slide type
// ─────────────────────────────────────────────────────────────────────────────

function SlideRenderer({ slide, lesson, subject }: { slide: Slide; lesson: Lesson; subject: SubjectNotes }) {
  switch (slide.type) {
    case 'title':
      return <TitleSlide slide={slide} lesson={lesson} subject={subject} />
    case 'overview':
      return <OverviewSlide slide={slide} />
    case 'objectives':
      return <ObjectivesSlide slide={slide} />
    case 'prerequisites':
      return <PrerequisitesSlide slide={slide} />
    case 'theory':
      return <TheorySlide slide={slide} />
    case 'concepts':
      return <ConceptsSlide slide={slide} />
    case 'analogy':
      return <AnalogySlide slide={slide} />
    case 'diagram':
      return <DiagramSlide slide={slide} />
    case 'table':
      return <TableSlide slide={slide} />
    case 'code':
      return <CodeSlide slide={slide} />
    case 'complexity':
      return <ComplexitySlide slide={slide} />
    case 'worked':
      return <WorkedExampleSlide slide={slide} />
    case 'mistakes':
      return <MistakesSlide slide={slide} />
    case 'callouts':
      return <CalloutsSlide slide={slide} />
    case 'viva':
      return <VivaSlide slide={slide} />
    case 'interview':
      return <InterviewSlide slide={slide} />
    case 'exam':
      return <ExamSlide slide={slide} />
    case 'formulas':
      return <FormulasSlide slide={slide} />
    case 'summary':
      return <SummarySlide slide={slide} />
    case 'cheatsheet':
      return <CheatsheetSlide slide={slide} />
    case 'mnemonics':
      return <MnemonicsSlide slide={slide} />
    case 'quiz':
      return <QuizSlide slide={slide} />
    case 'flashcards':
      return <FlashcardsSlide slide={slide} />
    case 'ai-summaries':
      return <AISummariesSlide slide={slide} />
    case 'closing':
      return <ClosingSlide slide={slide} lesson={lesson} subject={subject} />
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual slide components
// ─────────────────────────────────────────────────────────────────────────────

function SlideHeader({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="slide-header">
      <div className="slide-header__icon">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="slide-header__title">{title}</h2>
    </div>
  )
}

function TitleSlide({ lesson, subject }: { slide: Slide; lesson: Lesson; subject: SubjectNotes }) {
  return (
    <div className="slide-content slide-content--title">
      <div className="slide-title-badge">
        <BookOpen className="h-4 w-4" />
        {subject.subjectCode} · Unit {subject.units.find(u => u.lessons.some(l => l.slug === lesson.slug))?.number ?? '—'}
      </div>
      <h1 className="slide-title-heading">{lesson.title}</h1>
      <p className="slide-title-subject">{subject.subjectName}</p>
      <div className="slide-title-meta">
        <span className="slide-meta-pill"><Clock className="h-3.5 w-3.5" /> {lesson.durationMin} min</span>
        <span className="slide-meta-pill"><BarChart3 className="h-3.5 w-3.5" /> <span className="capitalize">{lesson.difficulty}</span></span>
      </div>
      <div className="slide-title-glow" aria-hidden />
    </div>
  )
}

function OverviewSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <p className="slide-lead-text">{slide.content as string}</p>
    </div>
  )
}

function ObjectivesSlide({ slide }: { slide: Slide }) {
  const objectives = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-card-grid slide-card-grid--2">
        {objectives.map((o, i) => (
          <div key={i} className="slide-objective-card">
            <span className="slide-objective-card__number">{i + 1}</span>
            <span>{o}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrerequisitesSlide({ slide }: { slide: Slide }) {
  const items = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-card-grid slide-card-grid--1">
        {items.map((p, i) => (
          <div key={i} className="slide-prereq-card">
            <ListChecks className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <span>{p}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TheorySlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <MarkdownRenderer content={slide.content as string} />
    </div>
  )
}

function ConceptsSlide({ slide }: { slide: Slide }) {
  const concepts = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-card-grid slide-card-grid--2">
        {concepts.map((c, i) => (
          <div key={i} className="slide-concept-card">
            <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
            <span>{c}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnalogySlide({ slide }: { slide: Slide }) {
  const analogy = slide.content as { scenario: string; mapping: string }
  return (
    <div className="slide-content">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-analogy-card">
        <div className="slide-analogy-card__icon"><Sparkles className="h-5 w-5" /></div>
        <h3 className="slide-analogy-card__scenario">{analogy.scenario}</h3>
        <p className="slide-analogy-card__mapping">{analogy.mapping}</p>
      </div>
    </div>
  )
}

function DiagramSlide({ slide }: { slide: Slide }) {
  const diagram = slide.content as { type: string; title: string; content: string }
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <DiagramRenderer diagram={diagram} />
    </div>
  )
}

function TableSlide({ slide }: { slide: Slide }) {
  const table = slide.content as { title?: string; headers: string[]; rows: string[][]; note?: string }
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-table-wrap">
        <table className="slide-table">
          <thead>
            <tr>{table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((row, j) => (
              <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {table.note && <p className="slide-table-note">{table.note}</p>}
      </div>
    </div>
  )
}

function CodeSlide({ slide }: { slide: Slide }) {
  const ex = slide.content as { language: string; title: string; code: string; explanation: string }
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <CodeBlock code={ex.code} language={ex.language} title={ex.title} showLineNumbers collapsible={false} />
      {ex.explanation && <p className="slide-code-explanation"><Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />{ex.explanation}</p>}
    </div>
  )
}

function ComplexitySlide({ slide }: { slide: Slide }) {
  const c = slide.content as { time: string; space: string; explanation?: string }
  return (
    <div className="slide-content">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-complexity-grid">
        <div className="slide-complexity-card slide-complexity-card--time">
          <p className="slide-complexity-card__label">Time Complexity</p>
          <p className="slide-complexity-card__value">{c.time}</p>
        </div>
        <div className="slide-complexity-card slide-complexity-card--space">
          <p className="slide-complexity-card__label">Space Complexity</p>
          <p className="slide-complexity-card__value">{c.space}</p>
        </div>
      </div>
      {c.explanation && <p className="slide-complexity-explanation">{c.explanation}</p>}
    </div>
  )
}

function WorkedExampleSlide({ slide }: { slide: Slide }) {
  const ex = slide.content as { title: string; problem: string; solution: string; explanation?: string }
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-worked">
        <div className="slide-worked__problem">
          <p className="slide-worked__label">Problem</p>
          <p className="slide-worked__text">{ex.problem}</p>
        </div>
        <div className="slide-worked__solution">
          <p className="slide-worked__label">Solution</p>
          <pre className="slide-worked__code">{ex.solution}</pre>
        </div>
        {ex.explanation && <p className="slide-worked__explanation">{ex.explanation}</p>}
      </div>
    </div>
  )
}

function MistakesSlide({ slide }: { slide: Slide }) {
  const mistakes = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-card-grid slide-card-grid--1">
        {mistakes.map((m, i) => (
          <Callout key={i} type="warning" content={m} />
        ))}
      </div>
    </div>
  )
}

function CalloutsSlide({ slide }: { slide: Slide }) {
  const callouts = slide.content as Array<{ type: string; title?: string; content: string }>
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="space-y-3">
        {callouts.map((c, i) => (
          <Callout key={i} type={c.type} title={c.title} content={c.content} />
        ))}
      </div>
    </div>
  )
}

function VivaSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <MarkedQuestionList questions={slide.content as any[]} />
    </div>
  )
}

function InterviewSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <MarkedQuestionList questions={slide.content as any[]} />
    </div>
  )
}

function ExamSlide({ slide }: { slide: Slide }) {
  const questions = slide.content as any[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      {([2, 5, 10, 15] as const).map((marks) => {
        const qs = questions.filter((q) => q.marks === marks)
        if (qs.length === 0) return null
        return (
          <div key={marks} className="mb-5">
            <h3 className="slide-marks-heading">
              <span className="slide-marks-badge" data-marks={marks}>{marks}M</span>
              {marks}-Mark Questions
            </h3>
            <MarkedQuestionList questions={qs} />
          </div>
        )
      })}
    </div>
  )
}

function FormulasSlide({ slide }: { slide: Slide }) {
  const formulas = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-formula-grid">
        {formulas.map((f, i) => (
          <div key={i} className="slide-formula-card">
            <Zap className="h-4 w-4 text-primary shrink-0" />
            <span className="font-mono">{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SummarySlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-summary-card">
        <MarkdownRenderer content={slide.content as string} />
      </div>
    </div>
  )
}

function CheatsheetSlide({ slide }: { slide: Slide }) {
  const items = slide.content as string[]
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="slide-cheatsheet">
        {items.map((c, i) => (
          <div key={i} className="slide-cheatsheet-item">
            <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="font-mono">{c}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MnemonicsSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <MnemonicList items={slide.content as any[]} />
    </div>
  )
}

function QuizSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <PracticeQuiz questions={slide.content as any[]} />
    </div>
  )
}

function FlashcardsSlide({ slide }: { slide: Slide }) {
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <MiniFlashcardGrid cards={slide.content as any[]} />
    </div>
  )
}

function AISummariesSlide({ slide }: { slide: Slide }) {
  const summaries = slide.content as Array<{ style: string; content: string }>
  return (
    <div className="slide-content slide-scrollable">
      <SlideHeader icon={slide.icon} title={slide.title} />
      <div className="space-y-3">
        {summaries.map((s, i) => (
          <div key={i} className="slide-ai-summary">
            <span className="slide-ai-summary__badge">{s.style}</span>
            <p className="slide-ai-summary__text">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClosingSlide({ lesson, subject }: { slide: Slide; lesson: Lesson; subject: SubjectNotes }) {
  return (
    <div className="slide-content slide-content--closing">
      <div className="slide-closing-icon">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h2 className="slide-closing-title">Lesson Complete!</h2>
      <p className="slide-closing-subtitle">You&apos;ve finished <strong>{lesson.title}</strong></p>
      <div className="slide-closing-meta">
        <span className="slide-meta-pill"><BookOpen className="h-3.5 w-3.5" /> {subject.subjectName}</span>
      </div>
      <div className="slide-closing-actions">
        <Link href="/materials" className="slide-closing-btn slide-closing-btn--primary">
          Back to Materials <ArrowRight className="h-4 w-4" />
        </Link>
        <Link href={`/tutor?subject=${encodeURIComponent(subject.subjectName)}`} className="slide-closing-btn slide-closing-btn--secondary">
          <Bot className="h-4 w-4" /> Ask LEO
        </Link>
      </div>
    </div>
  )
}
