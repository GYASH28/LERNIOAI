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
  Sparkles,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MarkdownRenderer } from './markdown-renderer'
import { CodeBlock } from './code-block'
import { DiagramRenderer } from './diagram-renderer'
import { Callout, CalloutList } from './callout'
import { MarkedQuestionList, MnemonicList } from './marked-question-card'
import { MiniFlashcardGrid } from './mini-flashcard'
import { PracticeQuiz } from './practice-quiz'
import { AINotesToolbar } from './ai-notes-toolbar'

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
  { id: 'analogies', label: 'Analogies', icon: Sparkles, has: (l) => !!l.analogies?.length },
  { id: 'flowcharts', label: 'Flowcharts', icon: GitBranch, has: (l) => !!l.flowcharts?.length },
  { id: 'mindmaps', label: 'Mind Maps', icon: Network, has: (l) => !!l.mindMaps?.length },
  { id: 'tables', label: 'Tables', icon: TableIcon, has: (l) => !!l.tables?.length },
  { id: 'diagrams', label: 'Diagrams', icon: Network, has: (l) => !!l.diagrams?.length },
  { id: 'code', label: 'Code', icon: Code2, has: (l) => !!l.codeExamples?.length },
  { id: 'complexity', label: 'Complexity', icon: Gauge, has: (l) => !!l.complexity },
  { id: 'worked', label: 'Worked Examples', icon: Pencil, has: (l) => !!l.workedExamples?.length },
  { id: 'mistakes', label: 'Common Mistakes', icon: AlertTriangle, has: (l) => !!l.commonMistakes?.length },
  { id: 'callouts', label: 'Notes', icon: StickyNote, has: (l) => !!l.callouts?.length },
  { id: 'viva', label: 'Viva Q', icon: MessageCircle, has: (l) => !!l.vivaQuestions?.length },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, has: (l) => !!l.interviewQuestions?.length },
  { id: 'exam', label: 'Exam Q', icon: Award, has: (l) => !!l.examQuestions?.length },
  { id: 'formulas', label: 'Formulas', icon: Zap, has: (l) => !!l.formulas?.length },
  { id: 'summary', label: 'Summary', icon: FileText, has: (l) => !!l.revisionSummary },
  { id: 'cheatsheet', label: 'Cheat Sheet', icon: StickyNote, has: (l) => !!l.cheatSheet?.length },
  { id: 'mnemonics', label: 'Mnemonics', icon: Brain, has: (l) => !!l.mnemonics?.length },
  { id: 'quiz', label: 'Quiz', icon: ListOrdered, has: (l) => !!l.practiceQuestions?.length },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, has: (l) => !!l.flashcards?.length },
  { id: 'ai-summaries', label: 'AI Summaries', icon: Bot, has: (l) => !!l.aiSummaries?.length },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export interface MaterialsLessonRendererProps {
  lesson: Lesson
  subject: SubjectNotes
  prevHref?: string | null
  nextHref?: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}

export function MaterialsLessonRenderer({
  lesson,
  subject,
  prevHref,
  nextHref,
  prevTitle,
  nextTitle,
}: MaterialsLessonRendererProps) {
  const [activeSection, setActiveSection] = useState('overview')
  const [progress, setProgress] = useState(0)
  const [search, setSearch] = useState('')
  const [bookmarked, setBookmarked] = useState(() => {
    if (typeof window === 'undefined') return false
    const key = `lernio:materials:bookmark:${subject.subjectCode}:${lesson.slug}`
    return localStorage.getItem(key) === '1'
  })
  const mainRef = useRef<HTMLElement>(null)

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => s.has(lesson)),
    [lesson],
  )

  // Track scroll progress + active section
  useEffect(() => {
    const handler = () => {
      if (!mainRef.current) return
      const el = mainRef.current
      const totalHeight = el.scrollHeight - window.innerHeight + el.offsetTop
      const scrolled = window.scrollY - el.offsetTop
      const pct = Math.max(0, Math.min(100, (scrolled / totalHeight) * 100))
      setProgress(pct)

      for (const sec of visibleSections) {
        const target = document.getElementById(`m-section-${sec.id}`)
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

  const toggleBookmark = () => {
    const key = `lernio:materials:bookmark:${subject.subjectCode}:${lesson.slug}`
    const next = !bookmarked
    setBookmarked(next)
    if (next) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  }

  const handlePrint = () => window.print()

  return (
    <article className="materials-lesson" ref={mainRef}>
      {/* Reading progress bar */}
      <div className="reading-progress no-print" aria-hidden>
        <div
          className="reading-progress__bar"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      {/* Search + actions */}
      <div className="mb-6 flex flex-wrap items-center gap-2 no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search within this lesson…"
            className="w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
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
        <button
          onClick={toggleBookmark}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent/50 transition-colors"
          type="button"
        >
          {bookmarked ? (
            <>
              <BookmarkCheck className="h-3.5 w-3.5 text-primary" /> Saved
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5" /> Save
            </>
          )}
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent/50 transition-colors"
          type="button"
        >
          <Printer className="h-3.5 w-3.5" /> PDF
        </button>
      </div>

      {/* AI Toolbar */}
      <AINotesToolbar
        subjectName={subject.subjectName}
        lessonTitle={lesson.title}
        lessonOverview={lesson.overview}
      />

      {/* Sticky TOC */}
      <nav className="materials-toc no-print" aria-label="Lesson contents">
        {visibleSections.map((sec) => (
          <a
            key={sec.id}
            href={`#m-section-${sec.id}`}
            data-active={activeSection === sec.id ? 'true' : undefined}
            className="materials-toc__item"
          >
            <sec.icon className="h-3 w-3" />
            {sec.label}
          </a>
        ))}
      </nav>

      {/* Sections */}
      <div className="materials-sections">
        {visibleSections.map((sec) => (
          <SectionRenderer key={sec.id} section={sec} lesson={lesson} subject={subject} />
        ))}
      </div>

      {/* Footer nav */}
      <nav className="mt-10 flex items-stretch gap-3 border-t border-border pt-6 no-print">
        {prevHref ? (
          <a
            href={prevHref}
            className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-accent/5 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Previous</p>
              <p className="truncate text-sm font-semibold">{prevTitle || 'Previous lesson'}</p>
            </div>
          </a>
        ) : (
          <div className="flex-1" />
        )}
        {nextHref ? (
          <a
            href={nextHref}
            className="flex flex-1 items-center justify-end gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:bg-accent/5 transition-colors"
          >
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Next</p>
              <p className="truncate text-sm font-semibold">{nextTitle || 'Next lesson'}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </a>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Section renderer
// ─────────────────────────────────────────────────────────────────────────────

function SectionRenderer({
  section,
  lesson,
  subject,
}: {
  section: SectionDef
  lesson: Lesson
  subject: SubjectNotes
}) {
  const Icon = section.icon
  return (
    <section
      id={`m-section-${section.id}`}
      className="materials-lesson-section"
    >
      <div className="materials-lesson-section__header">
        <div className="materials-lesson-section__icon">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="materials-lesson-section__title">{section.label}</h2>
      </div>
      <SectionContent id={section.id} lesson={lesson} subject={subject} />
    </section>
  )
}

function SectionContent({ id, lesson, subject: _subject }: { id: string; lesson: Lesson; subject: SubjectNotes }) {
  switch (id) {
    case 'overview':
      return <p className="materials-lesson-prose materials-lesson-prose--lead">{lesson.overview}</p>

    case 'objectives':
      return (
        <div className="materials-card-grid materials-card-grid--2">
          {lesson.objectives!.map((o, i) => (
            <div key={i} className="materials-info-card materials-info-card--objective">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>{o}</span>
            </div>
          ))}
        </div>
      )

    case 'prerequisites':
      return (
        <div className="materials-card-grid materials-card-grid--2">
          {lesson.prerequisites!.map((p, i) => (
            <div key={i} className="materials-info-card materials-info-card--prereq">
              <ListChecks className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{p}</span>
            </div>
          ))}
        </div>
      )

    case 'theory':
      return <MarkdownRenderer content={lesson.theory!} />

    case 'concepts':
      return (
        <div className="materials-card-grid materials-card-grid--2">
          {lesson.keyConcepts!.map((c, i) => (
            <div key={i} className="materials-concept-card">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )

    case 'analogies':
      return (
        <div className="space-y-3">
          {lesson.analogies!.map((a, i) => (
            <div key={i} className="materials-analogy-card">
              <div className="materials-analogy-card__icon">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="materials-analogy-card__scenario">{a.scenario}</p>
                <p className="materials-analogy-card__mapping">{a.mapping}</p>
              </div>
            </div>
          ))}
        </div>
      )

    case 'flowcharts':
    case 'mindmaps':
      return (
        <div className="space-y-4">
          {(id === 'flowcharts' ? lesson.flowcharts! : lesson.mindMaps!).map((d, i) => (
            <DiagramRenderer key={i} diagram={d} />
          ))}
        </div>
      )

    case 'tables':
      return (
        <div className="space-y-4">
          {lesson.tables!.map((t, i) => (
            <div key={i} className="materials-table-wrap">
              {t.title && <p className="materials-table-wrap__title">{t.title}</p>}
              <div className="overflow-x-auto">
                <table className="materials-table">
                  <thead>
                    <tr>
                      {t.headers.map((h, j) => (
                        <th key={j}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {t.note && <p className="materials-table-wrap__note">{t.note}</p>}
            </div>
          ))}
        </div>
      )

    case 'diagrams':
      return (
        <div className="space-y-4">
          {lesson.diagrams!.map((d, i) => (
            <DiagramRenderer key={i} diagram={d} />
          ))}
        </div>
      )

    case 'code':
      return (
        <div className="space-y-4">
          {lesson.codeExamples!.map((ex, i) => (
            <div key={i} className="materials-code-section">
              <div className="materials-code-section__header">
                <Code2 className="h-4 w-4 text-green-500" />
                <span>{ex.title}</span>
                <span className="materials-code-section__lang">{ex.language}</span>
              </div>
              <CodeBlock
                code={ex.code}
                language={ex.language}
                title={ex.title}
                showLineNumbers
                collapsible
                collapseThreshold={20}
              />
              {ex.explanation && (
                <div className="materials-code-section__explanation">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <p>{ex.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )

    case 'complexity':
      return (
        <div className="materials-complexity-card">
          <div className="materials-complexity-card__item">
            <p className="materials-complexity-card__label">Time Complexity</p>
            <p className="materials-complexity-card__value materials-complexity-card__value--time">
              {lesson.complexity!.time}
            </p>
          </div>
          <div className="materials-complexity-card__divider" />
          <div className="materials-complexity-card__item">
            <p className="materials-complexity-card__label">Space Complexity</p>
            <p className="materials-complexity-card__value materials-complexity-card__value--space">
              {lesson.complexity!.space}
            </p>
          </div>
          {lesson.complexity!.explanation && (
            <div className="materials-complexity-card__explanation">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <p>{lesson.complexity!.explanation}</p>
            </div>
          )}
        </div>
      )

    case 'worked':
      return (
        <div className="space-y-3">
          {lesson.workedExamples!.map((ex, i) => (
            <div key={i} className="materials-worked-example">
              <div className="materials-worked-example__header">
                <Pencil className="h-4 w-4 text-primary" />
                <span>{ex.title}</span>
              </div>
              <div className="materials-worked-example__problem">
                <p className="materials-worked-example__label">Problem</p>
                <p>{ex.problem}</p>
              </div>
              <div className="materials-worked-example__solution">
                <p className="materials-worked-example__label">Solution</p>
                <pre className="whitespace-pre-wrap font-mono text-sm">{ex.solution}</pre>
              </div>
              {ex.explanation && (
                <p className="materials-worked-example__explanation">{ex.explanation}</p>
              )}
            </div>
          ))}
        </div>
      )

    case 'mistakes':
      return (
        <div className="materials-callout-grid">
          {lesson.commonMistakes!.map((m, i) => (
            <Callout key={i} type="warning" content={m} />
          ))}
        </div>
      )

    case 'callouts':
      return <CalloutList callouts={lesson.callouts!} />

    case 'viva':
      return <MarkedQuestionList questions={lesson.vivaQuestions!} />

    case 'interview':
      return <MarkedQuestionList questions={lesson.interviewQuestions!} />

    case 'exam':
      return (
        <div>
          {([2, 5, 10, 15] as const).map((marks) => {
            const qs = lesson.examQuestions!.filter((q) => q.marks === marks)
            if (qs.length === 0) return null
            return (
              <div key={marks} className="mb-5">
                <h3 className="materials-marks-heading">
                  <span className="materials-marks-badge" data-marks={marks}>{marks}M</span>
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
        <div className="materials-formula-grid">
          {lesson.formulas!.map((f, i) => (
            <div key={i} className="materials-formula-card">
              <Zap className="h-4 w-4 text-primary shrink-0" />
              <span className="font-mono">{f}</span>
            </div>
          ))}
        </div>
      )

    case 'summary':
      return (
        <div className="materials-summary-card">
          <MarkdownRenderer content={lesson.revisionSummary!} />
        </div>
      )

    case 'cheatsheet':
      return (
        <div className="materials-cheatsheet-card">
          {lesson.cheatSheet!.map((c, i) => (
            <div key={i} className="materials-cheatsheet-item">
              <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-mono">{c}</span>
            </div>
          ))}
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
            <div key={i} className="materials-ai-summary-card">
              <div className="materials-ai-summary-card__badge">{s.style}</div>
              <p>{s.content}</p>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}
