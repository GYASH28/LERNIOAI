'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  BookOpen,
  Target,
  ListChecks,
  FileText,
  Lightbulb,
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
  StickyNote,
  Zap,
  Brain,
  ListOrdered,
  Layers,
  Bot,
  Search,
  ChevronRight,
  Printer,
  Bookmark,
  BookmarkCheck,
  X,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  Link2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type {
  Lesson,
  SubjectNotes,
} from '@/lib/curriculum/lesson-notes-loader'
import { MarkdownRenderer } from './markdown-renderer'
import { CodeBlock } from './code-block'
import { DiagramRenderer } from './diagram-renderer'
import { CalloutList } from './callout'
import {
  MarkedQuestionList,
  MnemonicList,
} from './marked-question-card'
import { MiniFlashcardGrid } from './mini-flashcard'
import { PracticeQuiz } from './practice-quiz'
import { AINotesToolbar } from './ai-notes-toolbar'

// ─────────────────────────────────────────────────────────────────────────────
// Section registry — controls TOC ordering + which sections render
// ─────────────────────────────────────────────────────────────────────────────

interface SectionDef {
  id: string
  label: string
  icon: typeof BookOpen
  /** Returns true if this section has content to render. */
  has: (l: Lesson) => boolean
}

const SECTIONS: SectionDef[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen, has: (l) => !!l.overview },
  { id: 'objectives', label: 'Objectives', icon: Target, has: (l) => !!l.objectives?.length },
  { id: 'prerequisites', label: 'Prerequisites', icon: ListChecks, has: (l) => !!l.prerequisites?.length },
  { id: 'theory', label: 'Detailed Theory', icon: FileText, has: (l) => !!l.theory },
  { id: 'concepts', label: 'Key Concepts', icon: Lightbulb, has: (l) => !!l.keyConcepts?.length },
  { id: 'analogies', label: 'Real-life Analogies', icon: Lightbulb, has: (l) => !!l.analogies?.length },
  { id: 'flowcharts', label: 'Flowcharts', icon: GitBranch, has: (l) => !!l.flowcharts?.length },
  { id: 'mindmaps', label: 'Mind Maps', icon: Network, has: (l) => !!l.mindMaps?.length },
  { id: 'tables', label: 'Tables', icon: TableIcon, has: (l) => !!l.tables?.length },
  { id: 'diagrams', label: 'Diagrams', icon: Network, has: (l) => !!l.diagrams?.length },
  { id: 'code', label: 'Code Examples', icon: Code2, has: (l) => !!l.codeExamples?.length },
  { id: 'complexity', label: 'Complexity', icon: Gauge, has: (l) => !!l.complexity },
  { id: 'worked', label: 'Worked Examples', icon: Pencil, has: (l) => !!l.workedExamples?.length },
  { id: 'mistakes', label: 'Common Mistakes', icon: AlertTriangle, has: (l) => !!l.commonMistakes?.length },
  { id: 'callouts', label: 'Notes', icon: StickyNote, has: (l) => !!l.callouts?.length },
  { id: 'viva', label: 'Viva Questions', icon: MessageCircle, has: (l) => !!l.vivaQuestions?.length },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, has: (l) => !!l.interviewQuestions?.length },
  { id: 'exam', label: 'Exam Questions', icon: Award, has: (l) => !!l.examQuestions?.length },
  { id: 'formulas', label: 'Formulas', icon: Zap, has: (l) => !!l.formulas?.length },
  { id: 'summary', label: 'Revision Summary', icon: FileText, has: (l) => !!l.revisionSummary },
  { id: 'cheatsheet', label: 'Cheat Sheet', icon: StickyNote, has: (l) => !!l.cheatSheet?.length },
  { id: 'mnemonics', label: 'Mnemonics', icon: Brain, has: (l) => !!l.mnemonics?.length },
  { id: 'quiz', label: 'Practice Quiz', icon: ListOrdered, has: (l) => !!l.practiceQuestions?.length },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, has: (l) => !!l.flashcards?.length },
  { id: 'ai-summaries', label: 'AI Summaries', icon: Bot, has: (l) => !!l.aiSummaries?.length },
  { id: 'next', label: 'Next Lessons', icon: ChevronRight, has: (l) => !!l.recommendedNextLessons?.length },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface InteractiveNotesRendererProps {
  lesson: Lesson
  subject: SubjectNotes
  /** Href for previous lesson (if any). */
  prevHref?: string | null
  /** Href for next lesson (if any). */
  nextHref?: string | null
  /** Show the AI toolbar (default true). */
  showAI?: boolean
  /** Show the premium reader chrome (TOC, progress, search). Default true. */
  showReaderChrome?: boolean
  /** Optional bookmark callback — invoked in addition to the internal localStorage toggle. */
  onBookmarkToggle?: () => void
}

export function InteractiveNotesRenderer({
  lesson,
  subject,
  prevHref,
  nextHref,
  showAI = true,
  showReaderChrome = true,
  onBookmarkToggle,
}: InteractiveNotesRendererProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [progress, setProgress] = useState(0)
  const [search, setSearch] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [bookmarked, setBookmarked] = useState(() => {
    // Lazy init from localStorage (avoids setState-in-effect)
    if (typeof window === 'undefined') return false
    const key = `lernio:notes:bookmark:${subject.subjectCode}:${lesson.slug}`
    return localStorage.getItem(key) === '1'
  })
  const mainRef = useRef<HTMLElement>(null)

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => s.has(lesson)),
    [lesson],
  )

  // Estimated reading time — words / 200 wpm, rounded up to nearest minute.
  // Counts text from the primary prose sections: overview, theory, key concepts,
  // callouts, and worked examples.
  const readingTimeMin = useMemo(() => {
    const countWords = (s: string | undefined | null): number =>
      s ? s.trim().split(/\s+/).filter(Boolean).length : 0
    let words = 0
    words += countWords(lesson.overview)
    words += countWords(lesson.theory)
    if (lesson.keyConcepts) {
      words += lesson.keyConcepts.reduce((n, c) => n + countWords(c), 0)
    }
    if (lesson.callouts) {
      words += lesson.callouts.reduce(
        (n, c) => n + countWords(c.title) + countWords(c.content),
        0,
      )
    }
    if (lesson.workedExamples) {
      words += lesson.workedExamples.reduce(
        (n, ex) =>
          n +
          countWords(ex.title) +
          countWords(ex.problem) +
          countWords(ex.solution) +
          countWords(ex.explanation),
        0,
      )
    }
    return Math.max(1, Math.ceil(words / 200))
  }, [lesson])

  // Track scroll progress + active section
  useEffect(() => {
    const handler = () => {
      if (!mainRef.current) return
      const el = mainRef.current
      const totalHeight = el.scrollHeight - window.innerHeight + el.offsetTop
      const scrolled = window.scrollY - el.offsetTop
      const pct = Math.max(0, Math.min(100, (scrolled / totalHeight) * 100))
      setProgress(pct)

      // Find active section
      for (const sec of visibleSections) {
        const target = document.getElementById(`section-${sec.id}`)
        if (!target) continue
        const rect = target.getBoundingClientRect()
        if (rect.top >= -50 && rect.top < 300) {
          setActiveSection(sec.id)
          break
        }
      }
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [visibleSections])

  // ESC exits focus mode (and only focus mode — does not hijack other shortcuts).
  useEffect(() => {
    if (!focusMode) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode])

  const toggleBookmark = () => {
    const key = `lernio:notes:bookmark:${subject.subjectCode}:${lesson.slug}`
    const next = !bookmarked
    setBookmarked(next)
    if (next) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
    onBookmarkToggle?.()
  }

  const handlePrint = () => window.print()

  // Search filter — if search is active, only show matching sections
  const searchLower = search.trim().toLowerCase()
  const sectionsToRender = searchLower
    ? visibleSections.filter((s) => {
        const target = document.getElementById(`section-${s.id}`)
        if (!target) return false
        return target.textContent?.toLowerCase().includes(searchLower)
      })
    : visibleSections

  if (!showReaderChrome) {
    return (
      <div className="space-y-6">
        {showAI && (
          <AINotesToolbar
            subjectName={subject.subjectName}
            lessonTitle={lesson.title}
            lessonOverview={lesson.overview}
          />
        )}
        {visibleSections.map((sec, i) => (
          <SectionRenderer key={sec.id} section={sec} lesson={lesson} subject={subject} index={i} />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Reading progress bar — sticky top, 3px, var(--brand), smooth width transition */}
      <div
        className="no-print"
        aria-hidden
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          height: '3px',
          width: '100%',
          background: 'transparent',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'var(--brand)',
            transition: 'width 150ms ease-out',
          }}
        />
      </div>

      {/* Floating Exit-focus button (only when focus mode is on) */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed right-4 z-40 flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-md hover:bg-accent/50 transition-colors no-print"
          style={{ top: 'calc(var(--topbar-height, 3.5rem) + 0.75rem)' }}
          type="button"
          title="Exit focus mode (Esc)"
          aria-label="Exit focus mode"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Exit focus
        </button>
      )}

      <div
        className="premium-reader"
        style={focusMode ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}
      >
        {/* Left — sticky TOC (hidden in focus mode) */}
        {!focusMode && (
          <aside className="premium-reader__left no-print" aria-label="Table of contents">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contents
            </h3>
          </div>
          <nav className="toc-list">
            {visibleSections.map((sec) => (
              <a
                key={sec.id}
                href={`#section-${sec.id}`}
                data-active={activeSection === sec.id ? 'true' : undefined}
                data-level="1"
                className="toc-list__item"
              >
                {sec.label}
              </a>
            ))}
          </nav>

          {/* Bookmark + print */}
          <div className="mt-4 flex flex-col gap-1.5">
            <button
              onClick={toggleBookmark}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
              type="button"
            >
              {bookmarked ? (
                <>
                  <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Bookmarked
                </>
              ) : (
                <>
                  <Bookmark className="h-3.5 w-3.5" /> Bookmark lesson
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
              type="button"
            >
              <Printer className="h-3.5 w-3.5" /> Print / Save PDF
            </button>
          </div>
        </aside>
        )}

        {/* Center — main content */}
        <main className="premium-reader__main" ref={mainRef}>
          {/* Lesson title */}
          <header className="mb-4 pb-4 border-b border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
              {subject.subjectCode} · Unit {findUnitForLesson(subject, lesson)}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{lesson.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {lesson.durationMin} min read
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                <Clock className="h-3 w-3" />
                {readingTimeMin} min read
              </span>
              <span>·</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                {lesson.difficulty}
              </span>
              <span>·</span>
              <span>{visibleSections.length} sections</span>
              {/* Focus-mode toggle */}
              <button
                onClick={() => setFocusMode((v) => !v)}
                className="ml-auto flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium hover:bg-accent/50 transition-colors no-print"
                type="button"
                aria-pressed={focusMode}
                title={focusMode ? 'Exit focus mode (Esc)' : 'Enter focus mode'}
              >
                {focusMode ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
                {focusMode ? 'Exit focus' : 'Focus'}
              </button>
            </div>
          </header>

          {/* Search box (hidden in focus mode) */}
          {!focusMode && (
            <div className="mb-4 no-print">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search within this lesson…"
                  className="w-full rounded-md border border-border bg-card pl-9 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* AI Toolbar (hidden in focus mode) */}
          {showAI && !focusMode && (
            <AINotesToolbar
              subjectName={subject.subjectName}
              lessonTitle={lesson.title}
              lessonOverview={lesson.overview}
            />
          )}

          {/* Sections */}
          <div>
            {sectionsToRender.length === 0 && search && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No sections match &ldquo;{search}&rdquo;.
              </p>
            )}
            {sectionsToRender.map((sec, i) => (
              <SectionRenderer key={sec.id} section={sec} lesson={lesson} subject={subject} search={searchLower} index={i} />
            ))}
          </div>

          {/* Footer nav */}
          <nav className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4 no-print">
            {prevHref ? (
              <a
                href={prevHref}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </a>
            ) : (
              <span />
            )}
            {nextHref ? (
              <a
                href={nextHref}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <span />
            )}
          </nav>
        </main>

        {/* Right — quick actions / shortcuts (hidden in focus mode) */}
        {!focusMode && (
          <aside className="premium-reader__right no-print" aria-label="Quick actions">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick Actions
            </h3>
          </div>
          <div className="flex flex-col gap-1.5 text-xs">
            <a
              href={`/tutor?subject=${encodeURIComponent(subject.subjectName)}&topic=${encodeURIComponent(lesson.title)}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              Ask LEO about this
            </a>
            <a
              href={`/practice?subject=${subject.subjectCode}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
            >
              <ListOrdered className="h-3.5 w-3.5 text-primary" />
              Practice quizzes
            </a>
            <a
              href={`/revision?subject=${subject.subjectCode}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              Smart revision
            </a>
            <a
              href={`/exams?subject=${subject.subjectCode}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
            >
              <Award className="h-3.5 w-3.5 text-primary" />
              Exam questions
            </a>
            <a
              href={`/materials?subject=${subject.subjectCode}`}
              className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 hover:bg-accent/50 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              PDF materials
            </a>
          </div>

          {/* Reading progress */}
          <div className="mt-6">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Reading progress</span>
              <span className="font-mono text-primary">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </aside>
        )}
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section renderer — switches on section id
// ─────────────────────────────────────────────────────────────────────────────

function SectionRenderer({
  section,
  lesson,
  subject,
  search,
  index = 0,
}: {
  section: SectionDef
  lesson: Lesson
  subject: SubjectNotes
  search?: string
  index?: number
}) {
  const Icon = section.icon
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay: 0.03 * index }}
    >
      <section
        id={`section-${section.id}`}
        className="notes-section group"
        aria-labelledby={`heading-${section.id}`}
      >
        <h2 id={`heading-${section.id}`} className="notes-section__heading">
          <Icon className="h-5 w-5 text-primary" />
          {section.label}
          {/* Hover-revealed anchor link — copies deep link to this section */}
          <button
            onClick={() => copySectionLink(section.id)}
            className="ml-auto opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100"
            type="button"
            aria-label={`Copy link to ${section.label} section`}
            title="Copy link to this section"
          >
            <Link2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
          </button>
        </h2>
        <SectionContent id={section.id} lesson={lesson} subject={subject} search={search} />
      </section>
    </motion.div>
  )
}

function SectionContent({
  id,
  lesson,
  subject,
  search,
}: {
  id: string
  lesson: Lesson
  subject: SubjectNotes
  search?: string
}) {
  switch (id) {
    case 'overview':
      return (
        <p className="text-sm leading-relaxed text-foreground">
          <Highlight text={lesson.overview} search={search} />
        </p>
      )

    case 'objectives':
      return (
        <ul className="space-y-1.5">
          {lesson.objectives!.map((o, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <Target className="h-3.5 w-3.5 shrink-0 mt-1 text-primary" />
              <span><Highlight text={o} search={search} /></span>
            </li>
          ))}
        </ul>
      )

    case 'prerequisites':
      return (
        <ul className="space-y-1.5">
          {lesson.prerequisites!.map((p, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <ListChecks className="h-3.5 w-3.5 shrink-0 mt-1 text-amber-500" />
              <span><Highlight text={p} search={search} /></span>
            </li>
          ))}
        </ul>
      )

    case 'theory':
      return <MarkdownRenderer content={lesson.theory!} />

    case 'concepts':
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {lesson.keyConcepts!.map((c, i) => (
            <div
              key={i}
              className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 text-sm"
            >
              <Lightbulb className="mb-1 h-4 w-4 text-amber-500" />
              <span><Highlight text={c} search={search} /></span>
            </div>
          ))}
        </div>
      )

    case 'analogies':
      return (
        <div className="space-y-3">
          {lesson.analogies!.map((a, i) => (
            <div
              key={i}
              className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
            >
              <p className="text-sm font-semibold text-foreground">
                <Highlight text={a.scenario} search={search} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <Highlight text={a.mapping} search={search} />
              </p>
            </div>
          ))}
        </div>
      )

    case 'flowcharts':
      return (
        <div className="space-y-3">
          {lesson.flowcharts!.map((d, i) => (
            <DiagramRenderer key={i} diagram={d} />
          ))}
        </div>
      )

    case 'mindmaps':
      return (
        <div className="space-y-3">
          {lesson.mindMaps!.map((d, i) => (
            <DiagramRenderer key={i} diagram={d} />
          ))}
        </div>
      )

    case 'tables':
      return (
        <div className="space-y-4">
          {lesson.tables!.map((t, i) => (
            <div key={i}>
              {t.title && (
                <p className="mb-1.5 text-sm font-semibold">{t.title}</p>
              )}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-primary/10">
                    <tr>
                      {t.headers.map((h, j) => (
                        <th
                          key={j}
                          className="border-b border-border px-3 py-2 text-left font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, j) => (
                      <tr key={j} className={j % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className="border-b border-border/50 px-3 py-2 align-top"
                          >
                            <Highlight text={cell} search={search} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {t.note && (
                <p className="mt-1 text-xs italic text-muted-foreground">{t.note}</p>
              )}
            </div>
          ))}
        </div>
      )

    case 'diagrams':
      return (
        <div className="space-y-3">
          {lesson.diagrams!.map((d, i) => (
            <DiagramRenderer key={i} diagram={d} />
          ))}
        </div>
      )

    case 'code':
      return (
        <div className="space-y-4">
          {lesson.codeExamples!.map((ex, i) => (
            <div key={i}>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                <Code2 className="h-4 w-4 text-green-500" />
                {ex.title}
              </p>
              <CodeBlock
                code={ex.code}
                language={ex.language}
                title={ex.title}
                showLineNumbers
              />
              <p className="mt-1.5 text-xs text-muted-foreground">{ex.explanation}</p>
            </div>
          ))}
        </div>
      )

    case 'complexity':
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Time Complexity
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-primary">
                {lesson.complexity!.time}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                Space Complexity
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-primary">
                {lesson.complexity!.space}
              </p>
            </div>
          </div>
          {lesson.complexity!.explanation && (
            <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
              {lesson.complexity!.explanation}
            </p>
          )}
        </div>
      )

    case 'worked':
      return (
        <div className="space-y-3">
          {lesson.workedExamples!.map((ex, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{ex.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold">Problem: </span>
                {ex.problem}
              </p>
              <div className="mt-2 rounded-md bg-muted/40 p-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Solution
                </p>
                <pre className="mt-1 whitespace-pre-wrap text-sm font-mono text-foreground">
                  {ex.solution}
                </pre>
              </div>
              {ex.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">{ex.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )

    case 'mistakes':
      return (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <ul className="space-y-1.5">
            {lesson.commonMistakes!.map((m, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <span className="shrink-0 text-red-500">✗</span>
                <span><Highlight text={m} search={search} /></span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'callouts':
      return (
        <div
          className="shadow-premium-xs rounded-md p-4"
          style={{ borderLeft: '4px solid var(--brand)' }}
        >
          <CalloutList callouts={lesson.callouts!} />
        </div>
      )

    case 'viva':
      return <MarkedQuestionList questions={lesson.vivaQuestions!} />

    case 'interview':
      return <MarkedQuestionList questions={lesson.interviewQuestions!} />

    case 'exam':
      return (
        <div>
          {/* Group by marks */}
          {([2, 5, 10, 15] as const).map((marks) => {
            const qs = lesson.examQuestions!.filter((q) => q.marks === marks)
            if (qs.length === 0) return null
            return (
              <div key={marks} className="mb-4">
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  {marks}-Mark Questions
                </h3>
                <MarkedQuestionList questions={qs} />
              </div>
            )
          })}
        </div>
      )

    case 'formulas':
      return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <ul className="space-y-1.5">
            {lesson.formulas!.map((f, i) => (
              <li
                key={i}
                className="font-mono text-sm text-foreground flex gap-2"
              >
                <span className="text-primary">∑</span>
                <span><Highlight text={f} search={search} /></span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'summary':
      return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <MarkdownRenderer content={lesson.revisionSummary!} />
        </div>
      )

    case 'cheatsheet':
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <ul className="space-y-1">
            {lesson.cheatSheet!.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm font-mono text-foreground">
                <span className="text-primary shrink-0">›</span>
                <span><Highlight text={c} search={search} /></span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'mnemonics':
      return <MnemonicList items={lesson.mnemonics!} />

    case 'quiz':
      return <PracticeQuiz questions={lesson.practiceQuestions!} />

    case 'flashcards':
      return <MiniFlashcardGrid cards={lesson.flashcards!} />

    case 'ai-summaries':
      return (
        <div className="space-y-3">
          {lesson.aiSummaries!.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400">
                  {s.style}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      )

    case 'next':
      return (
        <div className="flex flex-wrap gap-2">
          {lesson.recommendedNextLessons!.map((slug, i) => (
            <a
              key={i}
              href={`/learn/DCOMP/semester/${subject.semester}/subject/${subject.subjectCode}/lesson/${slug}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5 text-primary" />
              {slug.split('-').map((w) => w[0]?.toUpperCase() + w.slice(1)).join(' ')}
            </a>
          ))}
        </div>
      )

    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy a deep link to a section heading to the clipboard and toast the result.
 * Lives at module scope so it can be called from SectionRenderer without prop drilling.
 */
function copySectionLink(sectionId: string) {
  if (typeof window === 'undefined') return
  const url = `${window.location.origin}${window.location.pathname}#section-${sectionId}`
  navigator.clipboard
    .writeText(url)
    .then(() => toast.success('Link copied', { description: url }))
    .catch(() => toast.error('Could not copy link'))
}

function findUnitForLesson(subject: SubjectNotes, lesson: Lesson): number | string {
  for (const u of subject.units) {
    if (u.lessons.some((l) => l.slug === lesson.slug)) return u.number
  }
  return '—'
}

function Highlight({ text, search }: { text: string; search?: string }) {
  if (!search || !text) return <>{text}</>
  const idx = text.toLowerCase().indexOf(search)
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-hit">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  )
}
