'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  BookOpen, Target, ListChecks, FileText, Lightbulb, Sparkles, GitBranch,
  Network, Table as TableIcon, Code2, Gauge, Pencil, AlertTriangle,
  MessageCircle, Briefcase, Award, Zap, Brain, Layers, ChevronRight,
  ChevronDown, Search, X, Bookmark, BookmarkCheck, Printer, ArrowLeft,
  ArrowRight, CheckCircle2, Info, Clock, BarChart3, Eye, EyeOff, Link2,
  GraduationCap, Star, StickyNote, Flame, type LucideIcon,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MarkdownRenderer } from './markdown-renderer'
import { CodeBlock } from './code-block'
import { Callout } from './callout'

// ─────────────────────────────────────────────────────────────────────────────
// Section registry
// ─────────────────────────────────────────────────────────────────────────────

interface SectionDef {
  id: string
  label: string
  icon: LucideIcon
  has: (l: Lesson) => boolean
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen, has: (l) => !!l.overview },
  { id: 'objectives', label: 'Objectives', icon: Target, has: (l) => !!l.objectives?.length },
  { id: 'prerequisites', label: 'Prerequisites', icon: ListChecks, has: (l) => !!l.prerequisites?.length },
  { id: 'theory', label: 'Theory', icon: FileText, has: (l) => !!l.theory },
  { id: 'concepts', label: 'Key Concepts', icon: Lightbulb, has: (l) => !!l.keyConcepts?.length },
  { id: 'callouts', label: 'Important Notes', icon: StickyNote, has: (l) => !!l.callouts?.length },
  { id: 'analogies', label: 'Analogies', icon: Sparkles, has: (l) => !!l.analogies?.length },
  { id: 'flowcharts', label: 'Flowcharts', icon: GitBranch, has: (l) => !!l.flowcharts?.length },
  { id: 'diagrams', label: 'Diagrams', icon: Network, has: (l) => !!l.diagrams?.length },
  { id: 'tables', label: 'Tables', icon: TableIcon, has: (l) => !!l.tables?.length },
  { id: 'code', label: 'Code Examples', icon: Code2, has: (l) => !!l.codeExamples?.length },
  { id: 'formulas', label: 'Formulas', icon: Zap, has: (l) => !!l.formulas?.length },
  { id: 'complexity', label: 'Complexity', icon: Gauge, has: (l) => !!l.complexity },
  { id: 'worked', label: 'Worked Examples', icon: Pencil, has: (l) => !!l.workedExamples?.length },
  { id: 'mistakes', label: 'Common Mistakes', icon: AlertTriangle, has: (l) => !!l.commonMistakes?.length },
  { id: 'exam-tips', label: 'Exam Tips', icon: GraduationCap, has: (l) => !!l.examTips?.length },
  { id: 'viva', label: 'Viva Questions', icon: MessageCircle, has: (l) => !!l.vivaQuestions?.length },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, has: (l) => !!l.interviewQuestions?.length },
  { id: 'exam', label: 'Exam Questions', icon: Award, has: (l) => !!l.examQuestions?.length },
  { id: 'mnemonics', label: 'Mnemonics', icon: Brain, has: (l) => !!l.mnemonics?.length },
  { id: 'cheatsheet', label: 'Cheat Sheet', icon: Layers, has: (l) => !!l.cheatSheet?.length },
  { id: 'summary', label: 'Revision Summary', icon: CheckCircle2, has: (l) => !!l.revisionSummary },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, has: (l) => !!l.flashcards?.length },
  { id: 'quiz', label: 'Practice Quiz', icon: GraduationCap, has: (l) => !!l.practiceQuestions?.length },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface PremiumLessonReaderProps {
  lesson: Lesson
  subject: SubjectNotes
  prevHref: string | null
  nextHref: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}

export function PremiumLessonReader({
  lesson, subject, prevHref, nextHref, prevTitle, nextTitle,
}: PremiumLessonReaderProps) {
  const [readingProgress, setReadingProgress] = useState(0)
  const [activeSection, setActiveSection] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [revealedFlashcards, setRevealedFlashcards] = useState<Set<number>>(new Set())
  const [openQA, setOpenQA] = useState<Set<string>>(new Set())
  const contentRef = useRef<HTMLDivElement>(null)

  const activeSections = useMemo(() => SECTIONS.filter((s) => s.has(lesson)), [lesson])

  // Reading progress + active section tracking
  useEffect(() => {
    const handler = () => {
      const el = contentRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const scrollTop = window.scrollY - (el.offsetTop + 80)
      const scrollHeight = el.scrollHeight - window.innerHeight + 80
      const progress = Math.max(0, Math.min(100, (scrollTop / scrollHeight) * 100))
      setReadingProgress(progress)

      // Find active section
      for (const section of activeSections) {
        const el2 = document.getElementById(`section-${section.id}`)
        if (el2) {
          const rect2 = el2.getBoundingClientRect()
          if (rect2.top > 60 && rect2.top < window.innerHeight * 0.4) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [activeSections])

  // Focus mode ESC
  useEffect(() => {
    if (!focusMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusMode])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setFocusMode((v) => !v)
      } else if (e.key === 'b' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        toggleBookmark()
      } else if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        // Let browser handle native print
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Estimated reading time
  const readingTime = useMemo(() => {
    const texts: string[] = []
    if (lesson.overview) texts.push(lesson.overview)
    if (lesson.theory) texts.push(lesson.theory)
    if (lesson.keyConcepts) texts.push(lesson.keyConcepts.join(' '))
    if (lesson.callouts) texts.push(lesson.callouts.map((c) => c.content).join(' '))
    if (lesson.workedExamples) texts.push(lesson.workedExamples.map((w) => w.problem + ' ' + w.solution).join(' '))
    if (lesson.revisionSummary) texts.push(lesson.revisionSummary)
    const words = texts.join(' ').split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
  }, [lesson])

  const toggleBookmark = () => {
    setBookmarked((v) => !v)
    toast.success(bookmarked ? 'Bookmark removed' : 'Lesson bookmarked')
  }

  const copySectionLink = useCallback((sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#section-${sectionId}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied', { description: 'Section link ready to share' })
    }).catch(() => {
      toast.error('Could not copy link')
    })
  }, [])

  const toggleFlashcard = useCallback((idx: number) => {
    setRevealedFlashcards((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }, [])

  const toggleQA = useCallback((id: string) => {
    setOpenQA((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`)
    if (el) {
      const top = el.offsetTop - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }, [])

  return (
    <div className={focusMode ? 'focus-mode-active' : ''}>
      {/* Reading progress bar */}
      <div className="lesson-progress-bar">
        <div className="lesson-progress-bar__fill" style={{ width: `${readingProgress}%` }} />
      </div>

      {/* Premium header */}
      <header className="lesson-header-premium">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                {subject.subjectCode} · Unit {subject.units.find((u) => u.lessons.some((l) => l.slug === lesson.slug))?.number} · {lesson.difficulty}
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-strong)] sm:text-3xl">
                {lesson.title}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="lesson-meta-chip"><Clock /> {lesson.durationMin} min</span>
                <span className="lesson-meta-chip"><BookOpen /> {readingTime} min read</span>
                <span className="lesson-meta-chip"><BarChart3 /> {lesson.difficulty}</span>
                <span className="lesson-meta-chip"><Layers /> {activeSections.length} sections</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFocusMode((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-inset)] hover:text-[var(--text-strong)]"
                title={focusMode ? 'Exit focus mode (Esc)' : 'Focus mode (F)'}
              >
                {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={toggleBookmark}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-inset)] hover:text-[var(--text-strong)]"
                title="Bookmark (B)"
              >
                {bookmarked ? <BookmarkCheck className="h-4 w-4 text-[var(--brand)]" /> : <Bookmark className="h-4 w-4" />}
              </button>
              <button
                onClick={() => window.print()}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-inset)] hover:text-[var(--text-strong)]"
                title="Print (Ctrl+P)"
              >
                <Printer className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3-column layout */}
      <div className={`lesson-reader-grid ${focusMode ? 'focus-mode' : ''}`} ref={contentRef}>
        {/* Left sidebar: TOC */}
        {!focusMode && (
          <aside className="lesson-reader__sidebar-left">
            <div className="mb-3 flex items-center gap-2 px-2">
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Contents
              </span>
            </div>
            <nav className="lesson-toc">
              {activeSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`lesson-toc__item ${activeSection === section.id ? 'active' : ''}`}
                  >
                    <Icon className="lesson-toc__icon" />
                    <span>{section.label}</span>
                  </button>
                )
              })}
            </nav>
          </aside>
        )}

        {/* Center: lesson content */}
        <article className="min-w-0">
          {activeSections.map((section, idx) => (
            <SectionRenderer
              key={section.id}
              section={section}
              lesson={lesson}
              index={idx}
              copySectionLink={copySectionLink}
              revealedFlashcards={revealedFlashcards}
              toggleFlashcard={toggleFlashcard}
              openQA={openQA}
              toggleQA={toggleQA}
            />
          ))}

          {/* Bottom action bar */}
          <div className="lesson-action-bar">
            <Link
              href="/revision"
              className="flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-[var(--text-inverse)] transition-transform hover:scale-[1.02]"
            >
              <Layers className="h-4 w-4" />
              Review {lesson.flashcards?.length || 0} Flashcards
            </Link>
            <Link
              href="/practice"
              className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-2.5 text-sm font-semibold text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-inset)]"
            >
              <GraduationCap className="h-4 w-4" />
              Take {lesson.practiceQuestions?.length || 0}-Question Quiz
            </Link>
            <button
              onClick={() => {
                toast.success('Lesson marked complete!', {
                  description: `+${lesson.durationMin * 2} XP earned`,
                })
              }}
              className="flex items-center gap-2 rounded-lg border border-[var(--success)] bg-[color-mix(in_oklch,var(--success)_8%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--success)] transition-colors hover:bg-[color-mix(in_oklch,var(--success)_15%,transparent)]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark as Complete
            </button>
          </div>

          {/* Prev/Next nav */}
          <div className="lesson-nav">
            {prevHref ? (
              <Link href={prevHref} className="lesson-nav__link">
                <span className="lesson-nav__label flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" /> Previous
                </span>
                <span className="lesson-nav__title">{prevTitle || 'Previous lesson'}</span>
              </Link>
            ) : <div />}
            {nextHref ? (
              <Link href={nextHref} className="lesson-nav__link lesson-nav__link--next">
                <span className="lesson-nav__label flex items-center gap-1 justify-end">
                  Next <ArrowRight className="h-3 w-3" />
                </span>
                <span className="lesson-nav__title">{nextTitle || 'Next lesson'}</span>
              </Link>
            ) : <div />}
          </div>
        </article>

        {/* Right sidebar: key terms + quick actions */}
        {!focusMode && (
          <aside className="lesson-reader__sidebar-right">
            <KeyTermsSidebar lesson={lesson} onNavigate={scrollToSection} />

            {/* Quick actions */}
            <div className="mt-4 space-y-2">
              <h4 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Quick Actions
              </h4>
              <Link
                href="/tutor"
                className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-default)] transition-colors hover:bg-[var(--surface-inset)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                Ask LEO about this
              </Link>
              <Link
                href="/revision"
                className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-default)] transition-colors hover:bg-[var(--surface-inset)]"
              >
                <Layers className="h-4 w-4 text-[var(--brand)]" />
                Revision hub
              </Link>
            </div>
          </aside>
        )}
      </div>

      {/* Focus mode exit button */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] shadow-lg transition-colors hover:bg-[var(--surface-inset)]"
        >
          <EyeOff className="h-4 w-4" />
          Exit focus
          <kbd className="ml-1 rounded border border-[var(--border-subtle)] px-1 text-xs">Esc</kbd>
        </button>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section renderer
// ─────────────────────────────────────────────────────────────────────────────

function SectionRenderer({
  section, lesson, index, copySectionLink, revealedFlashcards, toggleFlashcard, openQA, toggleQA,
}: {
  section: SectionDef
  lesson: Lesson
  index: number
  copySectionLink: (id: string) => void
  revealedFlashcards: Set<number>
  toggleFlashcard: (idx: number) => void
  openQA: Set<string>
  toggleQA: (id: string) => void
}) {
  const Icon = section.icon
  return (
    <motion.section
      id={`section-${section.id}`}
      className="lesson-section"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.3) }}
    >
      <div className="lesson-section__heading">
        <span className="lesson-section__heading-icon">
          <Icon className="h-4 w-4" />
        </span>
        {section.label}
        <button
          onClick={() => copySectionLink(section.id)}
          className="lesson-section__anchor"
          title="Copy section link"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
      <SectionContent
        sectionId={section.id}
        lesson={lesson}
        revealedFlashcards={revealedFlashcards}
        toggleFlashcard={toggleFlashcard}
        openQA={openQA}
        toggleQA={toggleQA}
      />
    </motion.section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section content switcher
// ─────────────────────────────────────────────────────────────────────────────

function SectionContent({
  sectionId, lesson, revealedFlashcards, toggleFlashcard, openQA, toggleQA,
}: {
  sectionId: string
  lesson: Lesson
  revealedFlashcards: Set<number>
  toggleFlashcard: (idx: number) => void
  openQA: Set<string>
  toggleQA: (id: string) => void
}) {
  switch (sectionId) {
    case 'overview':
      return <div className="lesson-prose"><MarkdownRenderer content={lesson.overview} /></div>

    case 'objectives':
      return (
        <div className="space-y-2">
          {lesson.objectives!.map((obj, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-[var(--surface-inset)] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
              <span className="text-sm text-[var(--text-default)]">{obj}</span>
            </div>
          ))}
        </div>
      )

    case 'prerequisites':
      return (
        <div className="space-y-2">
          {lesson.prerequisites!.map((pre, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-[var(--surface-inset)] p-3">
              <ListChecks className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand)]" />
              <span className="text-sm text-[var(--text-default)]">{pre}</span>
            </div>
          ))}
        </div>
      )

    case 'theory':
      return <div className="lesson-prose"><MarkdownRenderer content={lesson.theory!} /></div>

    case 'concepts':
      return (
        <div className="concept-grid">
          {lesson.keyConcepts!.map((concept, i) => (
            <div key={i} className="concept-card">
              <span className="concept-card__marker">{i + 1}</span>
              <span className="concept-card__text">{concept}</span>
            </div>
          ))}
        </div>
      )

    case 'callouts':
      return (
        <div className="space-y-3">
          {lesson.callouts!.map((callout, i) => (
            <Callout key={i} type={callout.type} title={callout.title} content={callout.content} />
          ))}
        </div>
      )

    case 'analogies':
      return (
        <div className="space-y-3">
          {lesson.analogies!.map((analogy, i) => (
            <div key={i} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                <span className="text-sm font-semibold text-[var(--text-strong)]">{analogy.scenario}</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{analogy.mapping}</p>
            </div>
          ))}
        </div>
      )

    case 'flowcharts':
    case 'diagrams': {
      const diagrams = sectionId === 'flowcharts' ? lesson.flowcharts : lesson.diagrams
      if (!diagrams) return null
      return (
        <div className="space-y-4">
          {diagrams.map((diag, i) => (
            <div key={i} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
              <p className="mb-3 text-sm font-semibold text-[var(--text-strong)]">{diag.title}</p>
              <FlowchartRenderer content={diag.content} />
            </div>
          ))}
        </div>
      )
    }

    case 'tables':
      return (
        <div className="space-y-4">
          {lesson.tables!.map((table, i) => (
            <div key={i}>
              {table.title && <p className="mb-2 text-sm font-semibold text-[var(--text-strong)]">{table.title}</p>}
              <div className="overflow-x-auto">
                <table className="lesson-table">
                  <thead>
                    <tr>{table.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => <td key={k}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {table.note && <p className="mt-2 text-xs text-[var(--text-muted)] italic">{table.note}</p>}
            </div>
          ))}
        </div>
      )

    case 'code':
      return (
        <div className="space-y-4">
          {lesson.codeExamples!.map((ex, i) => (
            <div key={i}>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[var(--text-strong)]">
                <Code2 className="h-4 w-4 text-green-500" />
                {ex.title}
              </p>
              <CodeBlock code={ex.code} language={ex.language} title={ex.title} showLineNumbers />
              {ex.explanation && <p className="mt-1.5 text-xs text-[var(--text-muted)]">{ex.explanation}</p>}
            </div>
          ))}
        </div>
      )

    case 'formulas':
      return (
        <div className="space-y-2">
          {lesson.formulas!.map((formula, i) => (
            <div key={i} className="formula-card">{formula}</div>
          ))}
        </div>
      )

    case 'complexity':
      if (!lesson.complexity) return null
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="complexity-badge complexity-badge--time">
              <Clock className="h-3.5 w-3.5" /> Time: {lesson.complexity.time}
            </span>
            <span className="complexity-badge complexity-badge--space">
              <Gauge className="h-3.5 w-3.5" /> Space: {lesson.complexity.space}
            </span>
          </div>
          {lesson.complexity.explanation && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{lesson.complexity.explanation}</p>
          )}
        </div>
      )

    case 'worked':
      return (
        <div className="space-y-3">
          {lesson.workedExamples!.map((ex, i) => (
            <div key={i} className="worked-example">
              <div className="worked-example__header">
                <Pencil className="h-4 w-4 text-[var(--brand)]" />
                {ex.title}
              </div>
              <div className="worked-example__body">
                <div className="worked-example__label">Problem</div>
                <p className="worked-example__problem">{ex.problem}</p>
                <div className="worked-example__label">Solution</div>
                <div className="worked-example__solution">{ex.solution}</div>
                {ex.explanation && (
                  <>
                    <div className="worked-example__label">Explanation</div>
                    <p className="worked-example__explanation">{ex.explanation}</p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )

    case 'mistakes':
      return (
        <div className="space-y-2">
          {lesson.commonMistakes!.map((mistake, i) => (
            <div key={i} className="mistake-card">
              <AlertTriangle className="mistake-card__icon h-4 w-4 flex-shrink-0" />
              <span>{mistake}</span>
            </div>
          ))}
        </div>
      )

    case 'exam-tips':
      return (
        <div className="space-y-2">
          {lesson.examTips!.map((tip, i) => (
            <div key={i} className="exam-tip-card">
              <GraduationCap className="exam-tip-card__icon h-4 w-4 flex-shrink-0" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )

    case 'viva':
      return (
        <div className="space-y-2">
          {lesson.vivaQuestions!.map((qa, i) => (
            <QAItem
              key={i}
              id={`viva-${i}`}
              marks={qa.marks}
              question={qa.question}
              answer={qa.modelAnswer}
              open={openQA.has(`viva-${i}`)}
              onToggle={toggleQA}
            />
          ))}
        </div>
      )

    case 'interview':
      return (
        <div className="space-y-2">
          {lesson.interviewQuestions!.map((qa, i) => (
            <QAItem
              key={i}
              id={`interview-${i}`}
              marks={qa.marks}
              question={qa.question}
              answer={qa.modelAnswer}
              open={openQA.has(`interview-${i}`)}
              onToggle={toggleQA}
            />
          ))}
        </div>
      )

    case 'exam':
      return (
        <div className="space-y-2">
          {lesson.examQuestions!.map((qa, i) => (
            <QAItem
              key={i}
              id={`exam-${i}`}
              marks={qa.marks}
              question={qa.question}
              answer={qa.modelAnswer}
              tips={qa.tips}
              open={openQA.has(`exam-${i}`)}
              onToggle={toggleQA}
            />
          ))}
        </div>
      )

    case 'mnemonics':
      return (
        <div className="space-y-2">
          {lesson.mnemonics!.map((mn, i) => (
            <div key={i} className="mnemonic-card">
              <p className="mnemonic-card__phrase">{mn.phrase}</p>
              <p className="mnemonic-card__expansion">{mn.expansion}</p>
              <p className="mnemonic-card__meaning">{mn.meaning}</p>
            </div>
          ))}
        </div>
      )

    case 'cheatsheet':
      return (
        <div className="cheatsheet-grid">
          {lesson.cheatSheet!.map((item, i) => (
            <div key={i} className="cheatsheet-item">
              <span className="cheatsheet-item__marker">›</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )

    case 'summary':
      return <div className="revision-summary"><MarkdownRenderer content={lesson.revisionSummary!} /></div>

    case 'flashcards':
      return (
        <div className="space-y-2">
          {lesson.flashcards!.map((fc, i) => (
            <div key={i} className="inline-flashcard">
              <div
                className="inline-flashcard__front"
                onClick={() => toggleFlashcard(i)}
              >
                <span>{fc.front}</span>
                <ChevronDown
                  className={`h-4 w-4 flex-shrink-0 transition-transform text-[var(--text-muted)] ${revealedFlashcards.has(i) ? 'rotate-180' : ''}`}
                />
              </div>
              <AnimatePresence>
                {revealedFlashcards.has(i) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="inline-flashcard__back">
                      {fc.back}
                      {fc.hint && <p className="inline-flashcard__hint">💡 {fc.hint}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )

    case 'quiz':
      return <InlineQuiz questions={lesson.practiceQuestions!} />

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Q&A item (collapsible)
// ─────────────────────────────────────────────────────────────────────────────

function QAItem({
  id, marks, question, answer, tips, open, onToggle,
}: {
  id: string
  marks: number
  question: string
  answer?: string
  tips?: string[]
  open: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="qa-item" data-open={open}>
      <button
        onClick={() => onToggle(id)}
        className="qa-item__trigger"
      >
        <span className="qa-item__marks">{marks}M</span>
        <span className="flex-1">{question}</span>
        <ChevronDown className="qa-item__chevron h-4 w-4" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="qa-item__answer">
              {answer ? (
                <div className="lesson-prose"><MarkdownRenderer content={answer} /></div>
              ) : (
                <p className="italic text-[var(--text-muted)]">Model answer not available for this question.</p>
              )}
              {tips && tips.length > 0 && (
                <div className="mt-2 flex items-start gap-2 rounded-md bg-[color-mix(in_oklch,var(--success)_5%,transparent)] p-2.5">
                  <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" />
                  <div className="text-sm text-[var(--text-default)]">
                    <span className="font-semibold">Tip: </span>
                    {tips.join(' · ')}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline quiz
// ─────────────────────────────────────────────────────────────────────────────

function InlineQuiz({ questions }: { questions: NonNullable<Lesson['practiceQuestions']> }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)

  const score = useMemo(() => {
    return questions.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0)
  }, [answers, questions])

  if (submitted) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--brand)_10%,transparent)]">
          <GraduationCap className="h-8 w-8 text-[var(--brand)]" />
        </div>
        <p className="text-3xl font-bold text-[var(--text-strong)]">{pct}%</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {score} of {questions.length} correct
        </p>
        <div className="mt-4 space-y-2 text-left">
          {questions.map((q, i) => (
            <div key={i} className="rounded-md border border-[var(--border-subtle)] p-3">
              <p className="text-sm font-medium text-[var(--text-strong)]">{q.question}</p>
              <p className={`mt-1 text-xs ${answers[i] === q.answer ? 'text-[var(--success)]' : 'text-[var(--destructive)]'}`}>
                {answers[i] === q.answer ? '✓ Correct' : `✗ Correct answer: ${q.options[q.answer]}`}
              </p>
              {q.explanation && <p className="mt-1 text-xs text-[var(--text-muted)]">{q.explanation}</p>}
            </div>
          ))}
        </div>
        <button
          onClick={() => { setSubmitted(false); setAnswers({}) }}
          className="mt-4 rounded-lg border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-inset)]"
        >
          Retake Quiz
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
          <p className="mb-3 text-sm font-semibold text-[var(--text-strong)]">
            <span className="mr-2 text-[var(--brand)]">Q{i + 1}.</span>
            {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, j) => (
              <button
                key={j}
                onClick={() => setAnswers((prev) => ({ ...prev, [i]: j }))}
                className={`flex w-full items-center gap-3 rounded-md border p-2.5 text-left text-sm transition-colors ${
                  answers[i] === j
                    ? 'border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_5%,transparent)] text-[var(--text-strong)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-default)] hover:bg-[var(--surface-inset)]'
                }`}
              >
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold ${
                  answers[i] === j
                    ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--text-inverse)]'
                    : 'border-[var(--border-default)] text-[var(--text-muted)]'
                }`}>
                  {String.fromCharCode(65 + j)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={() => setSubmitted(true)}
        disabled={Object.keys(answers).length < questions.length}
        className="w-full rounded-lg bg-[var(--brand)] py-2.5 text-sm font-semibold text-[var(--text-inverse)] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Flowchart renderer
// ─────────────────────────────────────────────────────────────────────────────

function FlowchartRenderer({ content }: { content: string }) {
  const lines = content.split('\n').filter((l) => l.trim())
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const nodes = line.split('->').map((n) => n.trim()).filter(Boolean)
        if (nodes.length === 0) return null
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            {nodes.map((node, j) => (
              <div key={j} className="flex items-center gap-2">
                {j > 0 && <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />}
                <span className="rounded-md border border-[var(--border-subtle)] bg-[color-mix(in_oklch,var(--brand)_4%,var(--surface-1))] px-3 py-1.5 text-sm font-medium text-[var(--text-default)]">
                  {node}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Key terms sidebar
// ─────────────────────────────────────────────────────────────────────────────

function KeyTermsSidebar({ lesson, onNavigate }: { lesson: Lesson; onNavigate: (id: string) => void }) {
  const terms = useMemo(() => {
    // Build key terms from concepts, callouts (definitions), and formulas
    const result: Array<{ term: string; def: string }> = []
    if (lesson.keyConcepts) {
      lesson.keyConcepts.slice(0, 6).forEach((c) => {
        const colonIdx = c.indexOf(':')
        if (colonIdx > 0) {
          result.push({ term: c.slice(0, colonIdx).trim(), def: c.slice(colonIdx + 1).trim() })
        } else {
          result.push({ term: c.split(' ').slice(0, 3).join(' ') + '...', def: c })
        }
      })
    }
    if (lesson.callouts) {
      lesson.callouts.filter((c) => c.type === 'definition').slice(0, 3).forEach((c) => {
        const colonIdx = c.content.indexOf(':')
        if (colonIdx > 0) {
          result.push({ term: c.content.slice(0, colonIdx).trim(), def: c.content.slice(colonIdx + 1).trim() })
        }
      })
    }
    return result.slice(0, 8)
  }, [lesson])

  if (terms.length === 0) return null

  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <BookOpen className="h-3.5 w-3.5" />
        Key Terms
      </h4>
      <div className="key-terms-list">
        {terms.map((term, i) => (
          <button
            key={i}
            onClick={() => onNavigate('concepts')}
            className="key-term-item"
          >
            <p className="key-term-item__term">{term.term}</p>
            <p className="key-term-item__def">{term.def}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
