'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  BookOpen, Target, FileText, Lightbulb, Sparkles, GitBranch, Network,
  Table as TableIcon, Code2, Zap, Gauge, Pencil, AlertTriangle,
  MessageCircle, Briefcase, Award, Layers, ChevronRight, ChevronDown,
  ChevronLeft, Bookmark, BookmarkCheck, Printer, ArrowRight, CheckCircle2,
  Clock, BarChart3, Eye, EyeOff, GraduationCap, Brain, Highlighter,
  Send, type LucideIcon,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MarkdownRenderer } from './markdown-renderer'
import { CodeBlock } from './code-block'
import { Callout } from './callout'

// ─────────────────────────────────────────────────────────────────────────────
// Phase definitions — pedagogically ordered learning path
// ─────────────────────────────────────────────────────────────────────────────

interface Phase {
  id: number
  name: string
  icon: LucideIcon
  description: string
}

const PHASES: Phase[] = [
  { id: 0, name: 'Start', icon: BookOpen, description: 'Overview & objectives' },
  { id: 1, name: 'Learn', icon: FileText, description: 'Core theory & concepts' },
  { id: 2, name: 'Visualize', icon: Network, description: 'Diagrams, tables & code' },
  { id: 3, name: 'Practice', icon: GraduationCap, description: 'Active recall & quiz' },
  { id: 4, name: 'Revise', icon: CheckCircle2, description: 'Summary & exam ready' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface LearnModeReaderProps {
  lesson: Lesson
  subject: SubjectNotes
  prevHref: string | null
  nextHref: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}

export function LearnModeReader({
  lesson, subject, prevHref, nextHref, prevTitle, nextTitle,
}: LearnModeReaderProps) {
  const [currentPhase, setCurrentPhase] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  const [highlights, setHighlights] = useState<Array<{ text: string; note?: string }>>([])
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false)
  const [annotationPos, setAnnotationPos] = useState({ x: 0, y: 0 })
  const [selectedText, setSelectedText] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const phaseContentRef = useRef<HTMLDivElement>(null)

  // Restore reading position + phase
  useEffect(() => {
    const saved = localStorage.getItem(`learn-progress-${lesson.slug}`)
    if (saved) {
      try {
        const { phase, highlights: savedHighlights } = JSON.parse(saved)
        if (typeof phase === 'number' && phase >= 0 && phase < PHASES.length) {
          setCurrentPhase(phase)
          toast.info('Resumed where you left off', {
            description: `Phase ${phase + 1}: ${PHASES[phase].name}`,
            duration: 2500,
          })
        }
        if (Array.isArray(savedHighlights)) {
          setHighlights(savedHighlights)
        }
      } catch {}
    }
  }, [lesson.slug])

  // Save progress
  const saveProgress = useCallback((phase: number, hl: Array<{ text: string; note?: string }>) => {
    localStorage.setItem(`learn-progress-${lesson.slug}`, JSON.stringify({ phase, highlights: hl }))
  }, [lesson.slug])

  useEffect(() => {
    saveProgress(currentPhase, highlights)
  }, [currentPhase, highlights, saveProgress])

  // Text selection annotation
  useEffect(() => {
    const handler = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim() || ''
      if (text.length > 3 && text.length < 500) {
        const range = selection?.getRangeAt(0)
        if (range) {
          const rect = range.getBoundingClientRect()
          setSelectedText(text)
          setAnnotationPos({ x: rect.left + rect.width / 2, y: rect.top - 10 })
          setShowAnnotationPopup(true)
          return
        }
      }
      setShowAnnotationPopup(false)
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  const addHighlight = () => {
    if (!selectedText) return
    setHighlights((prev) => [...prev, { text: selectedText }])
    toast.success('Highlighted', { description: 'Saved to this lesson' })
    setShowAnnotationPopup(false)
    window.getSelection()?.removeAllRanges()
  }

  const askLeo = () => {
    if (!selectedText) return
    // Navigate to tutor with the selected text as a query param
    const url = `/tutor?q=${encodeURIComponent(selectedText)}&lesson=${encodeURIComponent(lesson.slug)}`
    window.location.href = url
  }

  const copySelection = () => {
    navigator.clipboard.writeText(selectedText)
    toast.success('Copied to clipboard')
    setShowAnnotationPopup(false)
    window.getSelection()?.removeAllRanges()
  }

  const goToPhase = (phase: number) => {
    setCurrentPhase(phase)
    phaseContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const nextPhase = () => {
    if (currentPhase < PHASES.length - 1) {
      goToPhase(currentPhase + 1)
    }
  }

  const prevPhase = () => {
    if (currentPhase > 0) {
      goToPhase(currentPhase - 1)
    }
  }

  // Estimated reading time
  const readingTime = useMemo(() => {
    const texts: string[] = []
    if (lesson.overview) texts.push(lesson.overview)
    if (lesson.theory) texts.push(lesson.theory)
    if (lesson.keyConcepts) texts.push(lesson.keyConcepts.join(' '))
    if (lesson.revisionSummary) texts.push(lesson.revisionSummary)
    const words = texts.join(' ').split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
  }, [lesson])

  const unitNumber = subject.units.find((u) => u.lessons.some((l) => l.slug === lesson.slug))?.number

  return (
    <div ref={contentRef} className="learn-mode">
      {/* Annotation popup */}
      <AnimatePresence>
        {showAnnotationPopup && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              left: annotationPos.x,
              top: annotationPos.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 50,
            }}
            className="flex items-center gap-1 rounded-lg border p-1 shadow-lg"
            // Use inline styles for theme-aware colors
          >
            <div
              className="flex items-center gap-1 rounded-lg border p-1 shadow-lg"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                borderColor: 'var(--border-default)',
              }}
            >
              <button
                onClick={addHighlight}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-inset)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                title="Highlight this text"
              >
                <Highlighter className="h-3.5 w-3.5" style={{ color: 'var(--warning)' }} />
                Highlight
              </button>
              <button
                onClick={askLeo}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-inset)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                title="Ask LEO about this"
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--brand)' }} />
                Ask LEO
              </button>
              <button
                onClick={copySelection}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                style={{ color: 'var(--text-default)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-inset)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                title="Copy"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase progress bar — sticky top */}
      <div
        className="sticky top-0 z-30 border-b backdrop-blur-xl"
        style={{
          backgroundColor: 'color-mix(in oklch, var(--surface-1) 85%, transparent)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3">
          {/* Phase dots */}
          <div className="flex items-center justify-between gap-2">
            {PHASES.map((phase, idx) => {
              const Icon = phase.icon
              const isActive = idx === currentPhase
              const isComplete = idx < currentPhase
              return (
                <button
                  key={phase.id}
                  onClick={() => goToPhase(idx)}
                  className="flex flex-1 flex-col items-center gap-1.5 group no-tap"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300"
                    style={{
                      backgroundColor: isActive
                        ? 'var(--brand)'
                        : isComplete
                        ? 'color-mix(in oklch, var(--success) 15%, transparent)'
                        : 'var(--surface-2)',
                      borderColor: isActive
                        ? 'var(--brand)'
                        : isComplete
                        ? 'var(--success)'
                        : 'var(--border-default)',
                      color: isActive
                        ? 'var(--brand-contrast, var(--text-inverse))'
                        : isComplete
                        ? 'var(--success)'
                        : 'var(--text-muted)',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide transition-colors"
                    style={{
                      color: isActive ? 'var(--brand)' : isComplete ? 'var(--success)' : 'var(--text-muted)',
                    }}
                  >
                    {phase.name}
                  </span>
                </button>
              )
            })}
          </div>
          {/* Progress line */}
          <div
            className="mt-2 h-1 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--surface-inset)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, var(--brand), var(--success))' }}
              initial={{ width: '0%' }}
              animate={{ width: `${((currentPhase + 1) / PHASES.length) * 100}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Lesson header — only on phase 0 */}
      {currentPhase === 0 && (
        <header
          className="border-b"
          style={{
            background: 'linear-gradient(135deg, color-mix(in oklch, var(--brand) 6%, var(--surface-1)) 0%, var(--surface-1) 100%)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
            <p
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--brand)' }}
            >
              {subject.subjectCode} · Unit {unitNumber} · {lesson.difficulty}
            </p>
            <h1
              className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
              style={{ color: 'var(--text-strong)' }}
            >
              {lesson.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
              >
                <Clock className="h-3.5 w-3.5" /> {lesson.durationMin} min
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
              >
                <BookOpen className="h-3.5 w-3.5" /> {readingTime} min read
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
              >
                <BarChart3 className="h-3.5 w-3.5" /> {lesson.difficulty}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
              >
                <Layers className="h-3.5 w-3.5" /> {lesson.flashcards?.length || 0} flashcards
              </span>
            </div>
          </div>
        </header>
      )}

      {/* Phase content — single focused reading column */}
      <main ref={phaseContentRef} className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <PhaseContent
              phase={currentPhase}
              lesson={lesson}
              highlights={highlights}
            />
          </motion.div>
        </AnimatePresence>

        {/* Phase navigation */}
        <div className="mt-12 flex items-center justify-between gap-3">
          <button
            onClick={prevPhase}
            disabled={currentPhase === 0}
            className="flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--surface-1)',
              color: 'var(--text-default)',
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="text-center">
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Phase {currentPhase + 1} of {PHASES.length}
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
              {PHASES[currentPhase].name}
            </p>
          </div>

          {currentPhase < PHASES.length - 1 ? (
            <button
              onClick={nextPhase}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--brand)',
                color: 'var(--brand-contrast, var(--text-inverse))',
              }}
            >
              <span className="hidden sm:inline">Continue</span>
              <span className="sm:hidden">Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                toast.success('Lesson complete! 🎉', {
                  description: `+${lesson.durationMin * 2} XP earned · ${lesson.flashcards?.length || 0} flashcards ready for review`,
                })
                if (nextHref) {
                  setTimeout(() => window.location.href = nextHref, 1500)
                }
              }}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: 'var(--success)',
                color: 'var(--text-inverse)',
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Complete
            </button>
          )}
        </div>

        {/* Prev/next lesson — only on last phase */}
        {currentPhase === PHASES.length - 1 && (prevHref || nextHref) && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {prevHref ? (
              <Link
                href={prevHref}
                className="flex flex-col gap-1 rounded-lg border p-4 transition-all hover:scale-[1.01]"
                style={{
                  borderColor: 'var(--border-subtle)',
                  backgroundColor: 'var(--surface-1)',
                }}
              >
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  <ChevronLeft className="h-3 w-3" /> Previous lesson
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
                  {prevTitle || 'Previous'}
                </span>
              </Link>
            ) : <div />}
            {nextHref ? (
              <Link
                href={nextHref}
                className="flex flex-col items-end gap-1 rounded-lg border p-4 text-right transition-all hover:scale-[1.01]"
                style={{
                  borderColor: 'var(--brand)',
                  backgroundColor: 'color-mix(in oklch, var(--brand) 5%, var(--surface-1))',
                }}
              >
                <span className="flex items-center justify-end gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
                  Next lesson <ChevronRight className="h-3 w-3" />
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
                  {nextTitle || 'Next'}
                </span>
              </Link>
            ) : <div />}
          </div>
        )}
      </main>

      {/* Floating bookmark + print */}
      <div className="fixed bottom-6 right-4 z-30 flex flex-col gap-2 sm:right-6">
        <button
          onClick={() => {
            setBookmarked((v) => !v)
            toast.success(bookmarked ? 'Bookmark removed' : 'Lesson bookmarked')
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-default)',
            color: bookmarked ? 'var(--brand)' : 'var(--text-muted)',
          }}
          title="Bookmark (B)"
        >
          {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
        <button
          onClick={() => window.print()}
          className="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-muted)',
          }}
          title="Print"
        >
          <Printer className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase content — renders the right sections for each phase
// ─────────────────────────────────────────────────────────────────────────────

function PhaseContent({
  phase, lesson, highlights,
}: {
  phase: number
  lesson: Lesson
  highlights: Array<{ text: string; note?: string }>
}) {
  switch (phase) {
    case 0: // Start — Overview + Objectives + Prerequisites
      return <StartPhase lesson={lesson} />
    case 1: // Learn — Theory + Concepts + Callouts + Analogies
      return <LearnPhase lesson={lesson} highlights={highlights} />
    case 2: // Visualize — Diagrams + Flowcharts + Tables + Code + Formulas + Complexity
      return <VisualizePhase lesson={lesson} />
    case 3: // Practice — Worked Examples + Flashcards + Quiz + Mistakes
      return <PracticePhase lesson={lesson} />
    case 4: // Revise — Summary + Cheat Sheet + Mnemonics + Exam Tips + Q&A
      return <RevisePhase lesson={lesson} />
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 0: Start
// ─────────────────────────────────────────────────────────────────────────────

function StartPhase({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-8">
      {/* Hook — overview */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
          <Sparkles className="h-5 w-5" style={{ color: 'var(--brand)' }} />
          Why this matters
        </h2>
        <div className="learn-prose">
          <MarkdownRenderer content={lesson.overview} />
        </div>
      </section>

      {/* Objectives */}
      {lesson.objectives && lesson.objectives.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Target className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            By the end of this lesson, you will
          </h2>
          <div className="space-y-2.5">
            {lesson.objectives.map((obj, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg p-3"
                style={{ backgroundColor: 'var(--surface-inset)' }}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 12%, transparent)', color: 'var(--brand)' }}
                >
                  {i + 1}
                </div>
                <span className="text-sm leading-relaxed" style={{ color: 'var(--text-default)' }}>
                  {obj}
                </span>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Prerequisites */}
      {lesson.prerequisites && lesson.prerequisites.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <BookOpen className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Before you start
          </h2>
          <div className="space-y-2">
            {lesson.prerequisites.map((pre, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-lg border p-3 text-sm"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                {pre}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Start learning CTA */}
      <div
        className="rounded-xl border p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, color-mix(in oklch, var(--brand) 8%, var(--surface-1)), color-mix(in oklch, var(--success) 4%, var(--surface-1)))',
          borderColor: 'color-mix(in oklch, var(--brand) 20%, var(--border-subtle))',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Ready to dive in? The next phase covers the core theory with inline callouts and analogies.
        </p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          💡 Tip: Select any text to highlight it or ask LEO about it
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Learn — Theory + Concepts + Callouts + Analogies
// ─────────────────────────────────────────────────────────────────────────────

function LearnPhase({
  lesson, highlights,
}: {
  lesson: Lesson
  highlights: Array<{ text: string; note?: string }>
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
          <FileText className="h-5 w-5" style={{ color: 'var(--brand)' }} />
          Core Theory
        </h2>
        <div className="learn-prose">
          <MarkdownRenderer content={lesson.theory || lesson.overview} />
        </div>
      </section>

      {/* Callouts woven into the learning */}
      {lesson.callouts && lesson.callouts.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
            <Lightbulb className="h-5 w-5" style={{ color: 'var(--warning)' }} />
            Important Notes
          </h3>
          <div className="space-y-3">
            {lesson.callouts.map((callout, i) => (
              <Callout key={i} type={callout.type} title={callout.title} content={callout.content} />
            ))}
          </div>
        </section>
      )}

      {/* Key concepts as definition cards */}
      {lesson.keyConcepts && lesson.keyConcepts.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
            <Lightbulb className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Key Concepts
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {lesson.keyConcepts.map((concept, i) => {
              const colonIdx = concept.indexOf(':')
              const term = colonIdx > 0 ? concept.slice(0, colonIdx).trim() : `Concept ${i + 1}`
              const def = colonIdx > 0 ? concept.slice(colonIdx + 1).trim() : concept
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border p-4 transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'var(--surface-1)',
                  }}
                >
                  <p className="mb-1 text-sm font-bold" style={{ color: 'var(--brand)' }}>
                    {term}
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-default)' }}>
                    {def}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}

      {/* Analogies */}
      {lesson.analogies && lesson.analogies.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
            <Sparkles className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Think of it like...
          </h3>
          <div className="space-y-3">
            {lesson.analogies.map((analogy, i) => (
              <div
                key={i}
                className="rounded-lg border-l-4 p-4"
                style={{
                  borderColor: 'var(--brand)',
                  backgroundColor: 'color-mix(in oklch, var(--brand) 4%, var(--surface-1))',
                }}
              >
                <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
                  {analogy.scenario}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {analogy.mapping}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights recap */}
      {highlights.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold" style={{ color: 'var(--text-strong)' }}>
            <Highlighter className="h-5 w-5" style={{ color: 'var(--warning)' }} />
            Your highlights
          </h3>
          <div className="space-y-2">
            {highlights.map((hl, i) => (
              <div
                key={i}
                className="rounded-md border-l-4 p-3 text-sm italic"
                style={{
                  borderColor: 'var(--warning)',
                  backgroundColor: 'color-mix(in oklch, var(--warning) 5%, var(--surface-1))',
                  color: 'var(--text-default)',
                }}
              >
                "{hl.text}"
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Visualize — Diagrams + Tables + Code + Formulas + Complexity
// ─────────────────────────────────────────────────────────────────────────────

function VisualizePhase({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-8">
      {/* Flowcharts */}
      {lesson.flowcharts && lesson.flowcharts.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <GitBranch className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Flowcharts
          </h2>
          <div className="space-y-4">
            {lesson.flowcharts.map((fc, i) => (
              <div key={i} className="rounded-lg border p-4" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
                <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{fc.title}</p>
                <FlowchartRender content={fc.content} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tables */}
      {lesson.tables && lesson.tables.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <TableIcon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Reference Tables
          </h2>
          <div className="space-y-4">
            {lesson.tables.map((table, i) => (
              <div key={i}>
                {table.title && <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{table.title}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm" style={{ border: `1px solid var(--border-subtle)` }}>
                    <thead>
                      <tr style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 6%, var(--surface-inset))' }}>
                        {table.headers.map((h, j) => (
                          <th key={j} className="p-2.5 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-strong)', borderBottom: `1px solid var(--border-default)` }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, j) => (
                        <tr key={j} className="transition-colors hover:bg-[color-mix(in_oklch,var(--brand)_3%,transparent)]">
                          {row.map((cell, k) => (
                            <td key={k} className="p-2.5" style={{ color: 'var(--text-default)', borderBottom: `1px solid var(--border-subtle)` }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {table.note && <p className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>{table.note}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Code examples */}
      {lesson.codeExamples && lesson.codeExamples.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Code2 className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Code Examples
          </h2>
          <div className="space-y-4">
            {lesson.codeExamples.map((ex, i) => (
              <div key={i}>
                <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{ex.title}</p>
                <CodeBlock code={ex.code} language={ex.language} title={ex.title} showLineNumbers />
                {ex.explanation && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{ex.explanation}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Formulas */}
      {lesson.formulas && lesson.formulas.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Zap className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Key Formulas
          </h2>
          <div className="space-y-2">
            {lesson.formulas.map((f, i) => (
              <div
                key={i}
                className="overflow-x-auto rounded-lg border p-3 font-mono text-sm"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-inset)', color: 'var(--text-strong)' }}
              >
                {f}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Complexity */}
      {lesson.complexity && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Gauge className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Complexity Analysis
          </h2>
          <div className="flex flex-wrap gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold font-mono"
              style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 10%, transparent)', color: 'var(--brand)' }}
            >
              <Clock className="h-4 w-4" /> Time: {lesson.complexity.time}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold font-mono"
              style={{ backgroundColor: 'color-mix(in oklch, var(--info) 10%, transparent)', color: 'var(--info)' }}
            >
              <Gauge className="h-4 w-4" /> Space: {lesson.complexity.space}
            </span>
          </div>
          {lesson.complexity.explanation && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {lesson.complexity.explanation}
            </p>
          )}
        </section>
      )}

      {lesson.flowcharts?.length === 0 && lesson.tables?.length === 0 && !lesson.codeExamples?.length && !lesson.formulas?.length && !lesson.complexity && (
        <div className="py-12 text-center">
          <Network className="mx-auto h-12 w-12" style={{ color: 'var(--text-muted)' }} />
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No visual aids for this lesson. Continue to practice!</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Practice — Worked Examples + Flashcards + Quiz + Mistakes
// ─────────────────────────────────────────────────────────────────────────────

function PracticePhase({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-8">
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: 'color-mix(in oklch, var(--brand) 20%, var(--border-subtle))',
          background: 'linear-gradient(135deg, color-mix(in oklch, var(--brand) 5%, var(--surface-1)), transparent)',
        }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          🎯 Active recall time
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Testing yourself is the most effective way to learn. Try each question before revealing the answer.
        </p>
      </div>

      {/* Worked examples */}
      {lesson.workedExamples && lesson.workedExamples.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Pencil className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Worked Examples
          </h2>
          <div className="space-y-4">
            {lesson.workedExamples.map((ex, i) => (
              <WorkedExample key={i} ex={ex} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Flashcards — actionable with SM-2 */}
      {lesson.flashcards && lesson.flashcards.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Layers className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Flashcards
          </h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Click to flip. Rate how well you knew it — this schedules your next review.
          </p>
          <div className="space-y-3">
            {lesson.flashcards.map((fc, i) => (
              <ActionableFlashcard key={i} flashcard={fc} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Practice quiz — immediate feedback per question */}
      {lesson.practiceQuestions && lesson.practiceQuestions.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <GraduationCap className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Quick Quiz
          </h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Answer each question to get instant feedback.
          </p>
          <InteractiveQuiz questions={lesson.practiceQuestions} />
        </section>
      )}

      {/* Common mistakes */}
      {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <AlertTriangle className="h-5 w-5" style={{ color: 'var(--destructive)' }} />
            Common Mistakes to Avoid
          </h2>
          <div className="space-y-2">
            {lesson.commonMistakes.map((mistake, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border-l-4 p-3 text-sm"
                style={{
                  borderColor: 'var(--destructive)',
                  backgroundColor: 'color-mix(in oklch, var(--destructive) 4%, var(--surface-1))',
                  color: 'var(--text-default)',
                }}
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--destructive)' }} />
                {mistake}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4: Revise — Summary + Cheat Sheet + Mnemonics + Exam Tips + Q&A
// ─────────────────────────────────────────────────────────────────────────────

function RevisePhase({ lesson }: { lesson: Lesson }) {
  return (
    <div className="space-y-8">
      {/* Revision summary */}
      {lesson.revisionSummary && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--success)' }} />
            Revision Summary
          </h2>
          <div
            className="rounded-xl border p-5"
            style={{
              background: 'linear-gradient(135deg, color-mix(in oklch, var(--brand) 6%, var(--surface-1)), color-mix(in oklch, var(--success) 4%, var(--surface-1)))',
              borderColor: 'color-mix(in oklch, var(--brand) 15%, var(--border-subtle))',
            }}
          >
            <div className="learn-prose">
              <MarkdownRenderer content={lesson.revisionSummary} />
            </div>
          </div>
        </section>
      )}

      {/* Exam tips */}
      {lesson.examTips && lesson.examTips.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <GraduationCap className="h-5 w-5" style={{ color: 'var(--success)' }} />
            Exam Tips
          </h2>
          <div className="space-y-2">
            {lesson.examTips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                style={{
                  borderColor: 'color-mix(in oklch, var(--success) 20%, var(--border-subtle))',
                  background: 'linear-gradient(135deg, color-mix(in oklch, var(--success) 5%, var(--surface-1)), color-mix(in oklch, var(--brand) 5%, var(--surface-1)))',
                  color: 'var(--text-default)',
                }}
              >
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                {tip}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cheat sheet */}
      {lesson.cheatSheet && lesson.cheatSheet.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Layers className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Cheat Sheet
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {lesson.cheatSheet.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg p-2.5 font-mono text-xs"
                style={{ backgroundColor: 'var(--surface-inset)', color: 'var(--text-default)' }}
              >
                <span style={{ color: 'var(--brand)' }}>›</span>
                {item}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mnemonics */}
      {lesson.mnemonics && lesson.mnemonics.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <Brain className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Memory Aids
          </h2>
          <div className="space-y-2">
            {lesson.mnemonics.map((mn, i) => (
              <div key={i} className="rounded-lg border p-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}>
                <p className="text-sm font-bold" style={{ color: 'var(--brand)' }}>{mn.phrase}</p>
                <p className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>{mn.expansion}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-default)' }}>{mn.meaning}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Q&A — Viva, Interview, Exam */}
      {(lesson.vivaQuestions?.length || lesson.interviewQuestions?.length || lesson.examQuestions?.length) ? (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-strong)' }}>
            <MessageCircle className="h-5 w-5" style={{ color: 'var(--brand)' }} />
            Practice Questions
          </h2>
          <div className="space-y-2">
            {lesson.vivaQuestions?.map((qa, i) => (
              <CollapsibleQA key={`viva-${i}`} id={`viva-${i}`} marks={qa.marks} question={qa.question} answer={qa.modelAnswer} label="Viva" />
            ))}
            {lesson.interviewQuestions?.map((qa, i) => (
              <CollapsibleQA key={`interview-${i}`} id={`interview-${i}`} marks={qa.marks} question={qa.question} answer={qa.modelAnswer} label="Interview" />
            ))}
            {lesson.examQuestions?.map((qa, i) => (
              <CollapsibleQA key={`exam-${i}`} id={`exam-${i}`} marks={qa.marks} question={qa.question} answer={qa.modelAnswer} tips={qa.tips} label="Exam" />
            ))}
          </div>
        </section>
      ) : null}

      {/* Completion CTA */}
      <div
        className="rounded-xl border p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, color-mix(in oklch, var(--success) 8%, var(--surface-1)), color-mix(in oklch, var(--brand) 4%, var(--surface-1)))',
          borderColor: 'color-mix(in oklch, var(--success) 20%, var(--border-subtle))',
        }}
      >
        <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: 'var(--success)' }} />
        <p className="mt-3 text-lg font-bold" style={{ color: 'var(--text-strong)' }}>
          You're ready for the exam!
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Mark this lesson complete to earn XP and add {lesson.flashcards?.length || 0} flashcards to your review queue.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link
            href="/revision"
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast, var(--text-inverse))' }}
          >
            <Layers className="h-4 w-4" />
            Review Flashcards
          </Link>
          <Link
            href="/tutor"
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-strong)' }}
          >
            <Sparkles className="h-4 w-4" style={{ color: 'var(--brand)' }} />
            Ask LEO
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function FlowchartRender({ content }: { content: string }) {
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
                {j > 0 && <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                <span
                  className="rounded-md border px-3 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    backgroundColor: 'color-mix(in oklch, var(--brand) 4%, var(--surface-1))',
                    color: 'var(--text-default)',
                  }}
                >
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

function WorkedExample({ ex, index }: { ex: { title: string; problem: string; solution: string; explanation?: string }; index: number }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}
    >
      <div
        className="flex items-center gap-2 p-3"
        style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 4%, var(--surface-inset))', borderBottom: `1px solid var(--border-subtle)` }}
      >
        <Pencil className="h-4 w-4" style={{ color: 'var(--brand)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>{ex.title || `Example ${index + 1}`}</span>
      </div>
      <div className="p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Problem</p>
        <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-default)' }}>{ex.problem}</p>

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-lg border-2 border-dashed py-2.5 text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
          >
            💡 Try it yourself, then reveal the solution
          </button>
        ) : (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Solution</p>
            <div
              className="mb-3 rounded-md border-l-4 p-3 text-sm leading-relaxed"
              style={{
                borderColor: 'var(--success)',
                backgroundColor: 'color-mix(in oklch, var(--success) 5%, var(--surface-inset))',
                color: 'var(--text-default)',
              }}
            >
              {ex.solution}
            </div>
            {ex.explanation && (
              <>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Explanation</p>
                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ex.explanation}</p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function ActionableFlashcard({ flashcard, index }: { flashcard: { front: string; back: string; hint?: string }; index: number }) {
  const [flipped, setFlipped] = useState(false)
  const [rated, setRated] = useState(false)

  const rate = (quality: 'again' | 'hard' | 'good' | 'easy') => {
    setRated(true)
    const messages = {
      again: 'Added to review queue for tomorrow',
      hard: 'Will review again soon',
      good: 'Next review in a few days',
      easy: 'Moved to long-term memory',
    }
    toast.success(messages[quality], { duration: 2000 })
    setTimeout(() => {
      setFlipped(false)
      setRated(false)
    }, 1200)
  }

  return (
    <div
      className="overflow-hidden rounded-lg border transition-all"
      style={{
        borderColor: flipped ? 'var(--brand)' : 'var(--border-subtle)',
        backgroundColor: 'var(--surface-1)',
      }}
    >
      <button
        onClick={() => !rated && setFlipped(!flipped)}
        className="w-full p-4 text-left"
        disabled={rated}
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 10%, transparent)', color: 'var(--brand)' }}
          >
            Card {index + 1}
          </span>
          {flipped && (
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {rated ? '✓ Rated' : 'Rate your recall'}
            </span>
          )}
        </div>
        <AnimatePresence mode="wait">
          {!flipped ? (
            <motion.p
              key="front"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm font-medium"
              style={{ color: 'var(--text-strong)' }}
            >
              {flashcard.front}
            </motion.p>
          ) : (
            <motion.div
              key="back"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-default)' }}>
                {flashcard.back}
              </p>
              {flashcard.hint && (
                <p className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>
                  💡 {flashcard.hint}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {!flipped && (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Tap to reveal answer
          </p>
        )}
      </button>

      {flipped && !rated && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="grid grid-cols-4 gap-1.5 border-t p-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            onClick={() => rate('again')}
            className="rounded-md py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'color-mix(in oklch, var(--destructive) 10%, transparent)', color: 'var(--destructive)' }}
          >
            ↻ Again
          </button>
          <button
            onClick={() => rate('hard')}
            className="rounded-md py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'color-mix(in oklch, var(--warning) 10%, transparent)', color: 'var(--warning)' }}
          >
            😕 Hard
          </button>
          <button
            onClick={() => rate('good')}
            className="rounded-md py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 10%, transparent)', color: 'var(--brand)' }}
          >
            👍 Good
          </button>
          <button
            onClick={() => rate('easy')}
            className="rounded-md py-2 text-xs font-semibold transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'color-mix(in oklch, var(--success) 10%, transparent)', color: 'var(--success)' }}
          >
            ⚡ Easy
          </button>
        </motion.div>
      )}
    </div>
  )
}

function InteractiveQuiz({ questions }: { questions: NonNullable<Lesson['practiceQuestions']> }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)

  const q = questions[current]
  const isLast = current === questions.length - 1
  const isComplete = answered === questions.length

  const select = (idx: number) => {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
    if (idx === q.answer) setScore((s) => s + 1)
    setAnswered((a) => a + 1)
  }

  const next = () => {
    if (isLast) return
    setCurrent((c) => c + 1)
    setSelected(null)
    setRevealed(false)
  }

  if (isComplete && isLast && revealed) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div
        className="rounded-xl border p-6 text-center"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}
      >
        <div
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: pct >= 80 ? 'color-mix(in oklch, var(--success) 12%, transparent)' : 'color-mix(in oklch, var(--brand) 12%, transparent)' }}
        >
          <GraduationCap className="h-8 w-8" style={{ color: pct >= 80 ? 'var(--success)' : 'var(--brand)' }} />
        </div>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>{pct}%</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {score} of {questions.length} correct
        </p>
        <button
          onClick={() => { setCurrent(0); setSelected(null); setRevealed(false); setScore(0); setAnswered(0) }}
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-strong)' }}
        >
          Retake Quiz
        </button>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}
    >
      <div
        className="flex items-center justify-between border-b p-3"
        style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-inset)' }}
      >
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Question {current + 1} of {questions.length}
        </span>
        <span className="text-xs font-semibold" style={{ color: 'var(--brand)' }}>
          Score: {score}/{answered}
        </span>
      </div>
      <div className="p-4">
        <p className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-strong)' }}>
          {q.question}
        </p>
        <div className="space-y-2">
          {q.options.map((opt, idx) => {
            const isCorrect = idx === q.answer
            const isSelected = idx === selected
            const showCorrect = revealed && isCorrect
            const showWrong = revealed && isSelected && !isCorrect
            return (
              <button
                key={idx}
                onClick={() => select(idx)}
                disabled={revealed}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-all"
                style={{
                  borderColor: showCorrect
                    ? 'var(--success)'
                    : showWrong
                    ? 'var(--destructive)'
                    : isSelected
                    ? 'var(--brand)'
                    : 'var(--border-subtle)',
                  backgroundColor: showCorrect
                    ? 'color-mix(in oklch, var(--success) 8%, var(--surface-1))'
                    : showWrong
                    ? 'color-mix(in oklch, var(--destructive) 8%, var(--surface-1))'
                    : 'var(--surface-1)',
                  color: 'var(--text-default)',
                  cursor: revealed ? 'default' : 'pointer',
                }}
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
                  style={{
                    borderColor: showCorrect ? 'var(--success)' : showWrong ? 'var(--destructive)' : 'var(--border-default)',
                    backgroundColor: showCorrect ? 'var(--success)' : showWrong ? 'var(--destructive)' : 'transparent',
                    color: (showCorrect || showWrong) ? 'var(--text-inverse)' : 'var(--text-muted)',
                  }}
                >
                  {showCorrect ? '✓' : showWrong ? '✗' : String.fromCharCode(65 + idx)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div
              className="rounded-lg p-3 text-sm"
              style={{
                backgroundColor: selected === q.answer
                  ? 'color-mix(in oklch, var(--success) 5%, var(--surface-inset))'
                  : 'color-mix(in oklch, var(--destructive) 5%, var(--surface-inset))',
                borderLeft: `3px solid ${selected === q.answer ? 'var(--success)' : 'var(--destructive)'}`,
                color: 'var(--text-default)',
              }}
            >
              <p className="mb-1 font-semibold" style={{ color: selected === q.answer ? 'var(--success)' : 'var(--destructive)' }}>
                {selected === q.answer ? '✓ Correct!' : '✗ Not quite'}
              </p>
              <p>{q.explanation}</p>
            </div>
            {!isLast && (
              <button
                onClick={next}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-transform hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--brand)', color: 'var(--brand-contrast, var(--text-inverse))' }}
              >
                Next Question <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function CollapsibleQA({
  id, marks, question, answer, tips, label,
}: {
  id: string
  marks: number
  question: string
  answer?: string
  tips?: string[]
  label: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--surface-1)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
          style={{ backgroundColor: 'color-mix(in oklch, var(--brand) 10%, transparent)', color: 'var(--brand)' }}
        >
          {label} · {marks}M
        </span>
        <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-default)' }}>{question}</span>
        <ChevronDown
          className="mt-0.5 h-4 w-4 shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="border-t p-3 text-sm leading-relaxed"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
            >
              {answer ? (
                <div className="learn-prose"><MarkdownRenderer content={answer} /></div>
              ) : (
                <p className="italic" style={{ color: 'var(--text-muted)' }}>Model answer not available.</p>
              )}
              {tips && tips.length > 0 && (
                <div
                  className="mt-2 flex items-start gap-2 rounded-md p-2.5"
                  style={{ backgroundColor: 'color-mix(in oklch, var(--success) 5%, transparent)' }}
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--success)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-default)' }}>
                    <strong>Tip:</strong> {tips.join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
