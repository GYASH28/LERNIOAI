'use client'

import { useState } from 'react'
import {
  NotebookPen,
  FileText,
  Zap,
  Briefcase,
  MessageCircle,
  ListChecks,
  Layers,
  Bot,
  Award,
  ChevronRight,
  Star,
  BookOpen,
  Sparkles,
  Languages,
  Baby,
  Code2,
} from 'lucide-react'
import type { SubjectNotes, MarkedQuestion } from '@/lib/curriculum/lesson-notes-loader'
import { LessonNotesRenderer } from './lesson-notes-renderer'
import { MarkedQuestionList } from './marked-question-card'
import { MiniFlashcardGrid } from './mini-flashcard'
import { PracticeQuiz } from './practice-quiz'
import { MarkdownRenderer } from './markdown-renderer'

type Tab =
  | 'lessons'
  | 'revision'
  | 'formulas'
  | 'interview'
  | 'viva'
  | 'pyq'
  | 'quizzes'
  | 'flashcards'
  | 'ai'

interface TabDef {
  id: Tab
  label: string
  icon: typeof NotebookPen
  count: (n: SubjectNotes) => number
}

const TABS: TabDef[] = [
  { id: 'lessons', label: 'Lesson Notes', icon: NotebookPen, count: (n) => n.units.reduce((s, u) => s + u.lessons.length, 0) },
  { id: 'revision', label: 'Revision', icon: FileText, count: (n) => (n.revisionNotes ? 1 : 0) },
  { id: 'formulas', label: 'Formulas', icon: Zap, count: (n) => countAll(n, 'formulas') },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, count: (n) => (n.interviewBank?.length ?? 0) + countMarked(n, 'interviewQuestions') },
  { id: 'viva', label: 'Viva Q', icon: MessageCircle, count: (n) => (n.vivaBank?.length ?? 0) + countMarked(n, 'vivaQuestions') },
  { id: 'pyq', label: 'PYQs', icon: Award, count: (n) => n.pyqBank?.length ?? 0 },
  { id: 'quizzes', label: 'Quizzes', icon: ListChecks, count: (n) => countAll(n, 'practiceQuestions') },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, count: (n) => countAll(n, 'flashcards') },
  { id: 'ai', label: 'AI Tools', icon: Bot, count: () => 1 },
]

function countAll(n: SubjectNotes, key: 'formulas' | 'practiceQuestions' | 'flashcards'): number {
  let total = 0
  for (const u of n.units) {
    for (const l of u.lessons) {
      if (key === 'formulas') total += l.formulas?.length ?? 0
      else if (key === 'practiceQuestions') total += l.practiceQuestions?.length ?? 0
      else if (key === 'flashcards') total += l.flashcards?.length ?? 0
    }
  }
  return total
}

function countMarked(n: SubjectNotes, key: 'interviewQuestions' | 'vivaQuestions' | 'examQuestions'): number {
  let total = 0
  for (const u of n.units) {
    for (const l of u.lessons) {
      total += (l[key] as MarkedQuestion[] | undefined)?.length ?? 0
    }
  }
  return total
}

export function ComprehensiveNotesSection({ notes }: { notes: SubjectNotes }) {
  const [active, setActive] = useState<Tab>('lessons')
  const visibleTabs = TABS.filter((t) => t.count(notes) > 0)

  const totalLessons = notes.units.reduce((s, u) => s + u.lessons.length, 0)
  const totalFormulas = countAll(notes, 'formulas')
  const totalQuizzes = countAll(notes, 'practiceQuestions')
  const totalFlashcards = countAll(notes, 'flashcards')

  return (
    <section>
      <div className="notes-hub">
        {/* ─── Premium header ─── */}
        <div className="notes-hub__header">
          <div className="notes-hub__title-row">
            <div className="notes-hub__icon-wrap">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="notes-hub__title">Complete Notes Hub</h2>
              <p className="notes-hub__subtitle">
                Comprehensive study material — lesson notes, revision, formulas, interview &amp; viva questions, quizzes, flashcards, PYQs, and AI tools. All in one place.
              </p>
            </div>
          </div>
          {/* Stats row */}
          <div className="notes-hub__stats">
            <span className="notes-hub__stat">
              <BookOpen className="h-3 w-3" />
              {totalLessons} lessons
            </span>
            <span className="notes-hub__stat">
              <Layers className="h-3 w-3" />
              {notes.units.length} units
            </span>
            {totalFormulas > 0 && (
              <span className="notes-hub__stat">
                <Zap className="h-3 w-3" />
                {totalFormulas} formulas
              </span>
            )}
            {totalQuizzes > 0 && (
              <span className="notes-hub__stat">
                <ListChecks className="h-3 w-3" />
                {totalQuizzes} quiz Qs
              </span>
            )}
            {totalFlashcards > 0 && (
              <span className="notes-hub__stat">
                <Layers className="h-3 w-3" />
                {totalFlashcards} flashcards
              </span>
            )}
          </div>
        </div>

        {/* ─── Tab bar ─── */}
        <div className="notes-hub__tabs" role="tablist">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon
            const count = tab.count(notes)
            return (
              <button
                key={tab.id}
                role="tab"
                data-active={active === tab.id ? 'true' : undefined}
                onClick={() => setActive(tab.id)}
                className="notes-hub__tab"
                type="button"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="notes-hub__tab-badge">{count}</span>
              </button>
            )
          })}
        </div>

        {/* ─── Tab content ─── */}
        <div className="notes-hub__content">
          {active === 'lessons' && <LessonNotesRenderer notes={notes} />}

          {active === 'revision' && notes.revisionNotes && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
              <MarkdownRenderer content={notes.revisionNotes} />
            </div>
          )}

          {active === 'formulas' && (
            <div className="formula-grid">
              {notes.units.flatMap((u) =>
                u.lessons.flatMap((l) =>
                  (l.formulas ?? []).map((f, i) => (
                    <div key={`${l.slug}-${i}`} className="formula-card">
                      <p className="formula-card__lesson">{l.title}</p>
                      <p className="formula-card__formula">{f}</p>
                    </div>
                  )),
                ),
              )}
            </div>
          )}

          {active === 'interview' && (
            <div className="space-y-3">
              {notes.interviewBank && notes.interviewBank.length > 0 && (
                <div className="unit-group">
                  <div className="unit-group__header">
                    <div className="unit-group__title">
                      <span className="unit-group__badge">★</span>
                      Subject-level Interview Bank
                    </div>
                    <span className="unit-group__weight">{notes.interviewBank.length} questions</span>
                  </div>
                  <div className="unit-group__body">
                    <MarkedQuestionList questions={notes.interviewBank} />
                  </div>
                </div>
              )}
              {notes.units.map((u) => {
                const lessonsWithInterviews = u.lessons.filter((l) => (l.interviewQuestions?.length ?? 0) > 0)
                if (lessonsWithInterviews.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                      <span className="unit-group__weight">{u.weightage}% weightage</span>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithInterviews.map((l) => (
                        <div key={l.slug} className="mb-4 last:mb-0">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {l.title}
                          </h4>
                          <MarkedQuestionList questions={l.interviewQuestions!} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'viva' && (
            <div className="space-y-3">
              {notes.vivaBank && notes.vivaBank.length > 0 && (
                <div className="unit-group">
                  <div className="unit-group__header">
                    <div className="unit-group__title">
                      <span className="unit-group__badge">★</span>
                      Subject-level Viva Bank
                    </div>
                    <span className="unit-group__weight">{notes.vivaBank.length} questions</span>
                  </div>
                  <div className="unit-group__body">
                    <MarkedQuestionList questions={notes.vivaBank} />
                  </div>
                </div>
              )}
              {notes.units.map((u) => {
                const lessonsWithViva = u.lessons.filter((l) => (l.vivaQuestions?.length ?? 0) > 0)
                if (lessonsWithViva.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                      <span className="unit-group__weight">{u.weightage}% weightage</span>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithViva.map((l) => (
                        <div key={l.slug} className="mb-4 last:mb-0">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {l.title}
                          </h4>
                          <MarkedQuestionList questions={l.vivaQuestions!} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'pyq' && notes.pyqBank && (
            <div>
              <div className="pyq-banner">
                <div className="pyq-banner__icon">
                  <Star className="h-4 w-4" />
                </div>
                <p className="pyq-banner__text">
                  Previous Year Questions — practice these for exam readiness. Each question includes a model answer you can reveal.
                </p>
              </div>
              <MarkedQuestionList questions={notes.pyqBank} />
            </div>
          )}

          {active === 'quizzes' && (
            <div className="space-y-4">
              {notes.units.map((u) => {
                const lessonsWithQuizzes = u.lessons.filter((l) => (l.practiceQuestions?.length ?? 0) > 0)
                if (lessonsWithQuizzes.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                      <span className="unit-group__weight">{u.weightage}% weightage</span>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithQuizzes.map((l) => (
                        <div key={l.slug} className="mb-4 last:mb-0">
                          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <ListChecks className="h-3.5 w-3.5" />
                            {l.title}
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                              {l.practiceQuestions!.length} Qs
                            </span>
                          </h4>
                          <PracticeQuiz questions={l.practiceQuestions!} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'flashcards' && (
            <div className="space-y-4">
              {notes.units.map((u) => {
                const lessonsWithCards = u.lessons.filter((l) => (l.flashcards?.length ?? 0) > 0)
                if (lessonsWithCards.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                      <span className="unit-group__weight">{u.weightage}% weightage</span>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithCards.map((l) => (
                        <div key={l.slug} className="mb-4 last:mb-0">
                          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            <Layers className="h-3.5 w-3.5" />
                            {l.title}
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                              {l.flashcards!.length} cards
                            </span>
                          </h4>
                          <MiniFlashcardGrid cards={l.flashcards!} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'ai' && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                  <Bot className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold">AI Tools for {notes.subjectName}</h3>
                  <p className="text-xs text-muted-foreground">Open any lesson to access these AI-powered study actions</p>
                </div>
              </div>
              <div className="ai-shortcut-grid">
                {[
                  { label: 'Explain', desc: 'Full deep explanation with examples', icon: Bot },
                  { label: 'Simplify', desc: 'Easy version with real-life analogy', icon: Sparkles },
                  { label: 'Hinglish', desc: 'Explanation in Hinglish', icon: Languages },
                  { label: 'Marathi', desc: 'Explanation in Marathi', icon: Languages },
                  { label: 'ELI10', desc: 'Explain like you are 10', icon: Baby },
                  { label: 'Examples', desc: '3 worked examples per topic', icon: Sparkles },
                  { label: 'Coding', desc: 'AI-generated coding problem', icon: Code2 },
                  { label: 'Quiz', desc: '5 MCQs with answers', icon: ListChecks },
                  { label: 'Flashcards', desc: '6 active-recall cards', icon: Layers },
                  { label: 'Summary', desc: 'One-page revision note', icon: FileText },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="ai-shortcut-card">
                      <div className="ai-shortcut-card__icon">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="ai-shortcut-card__label">{item.label}</p>
                        <p className="ai-shortcut-card__desc">{item.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
              <a
                href={`/tutor?subject=${encodeURIComponent(notes.subjectName)}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <Bot className="h-4 w-4" />
                Open LEO AI Tutor
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
