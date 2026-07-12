'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
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
  Brain,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import type { SubjectNotes, MarkedQuestion } from '@/lib/curriculum/lesson-notes-loader'
import { MarkedQuestionList } from './marked-question-card'
import { MiniFlashcardGrid } from './mini-flashcard'
import { PracticeQuiz } from './practice-quiz'
import { MarkdownRenderer } from './markdown-renderer'
import { MnemonicList } from './marked-question-card'

type Tab =
  | 'revision'
  | 'formulas'
  | 'concepts'
  | 'mistakes'
  | 'mnemonics'
  | 'interview'
  | 'viva'
  | 'pyq'
  | 'quizzes'
  | 'flashcards'
  | 'ai'

interface TabDef {
  id: Tab
  label: string
  icon: typeof FileText
  count: (n: SubjectNotes) => number
}

const TABS: TabDef[] = [
  { id: 'revision', label: 'Quick Revision', icon: FileText, count: (n) => (n.revisionNotes ? 1 : 0) },
  { id: 'formulas', label: 'Formulas', icon: Zap, count: (n) => countAll(n, 'formulas') },
  { id: 'concepts', label: 'Key Concepts', icon: BookOpen, count: (n) => countAll(n, 'keyConcepts') },
  { id: 'mistakes', label: 'Common Mistakes', icon: AlertTriangle, count: (n) => countAll(n, 'commonMistakes') },
  { id: 'mnemonics', label: 'Memory Tricks', icon: Brain, count: (n) => countAll(n, 'mnemonics') },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, count: (n) => (n.interviewBank?.length ?? 0) + countMarked(n, 'interviewQuestions') },
  { id: 'viva', label: 'Viva Q', icon: MessageCircle, count: (n) => (n.vivaBank?.length ?? 0) + countMarked(n, 'vivaQuestions') },
  { id: 'pyq', label: 'PYQs', icon: Award, count: (n) => n.pyqBank?.length ?? 0 },
  { id: 'quizzes', label: 'Quizzes', icon: ListChecks, count: (n) => countAll(n, 'practiceQuestions') },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, count: (n) => countAll(n, 'flashcards') },
  { id: 'ai', label: 'AI Tutor', icon: Bot, count: () => 1 },
]

function countAll(n: SubjectNotes, key: 'formulas' | 'practiceQuestions' | 'flashcards' | 'keyConcepts' | 'commonMistakes' | 'mnemonics'): number {
  let total = 0
  for (const u of n.units) {
    for (const l of u.lessons) {
      if (key === 'formulas') total += l.formulas?.length ?? 0
      else if (key === 'practiceQuestions') total += l.practiceQuestions?.length ?? 0
      else if (key === 'flashcards') total += l.flashcards?.length ?? 0
      else if (key === 'keyConcepts') total += l.keyConcepts?.length ?? 0
      else if (key === 'commonMistakes') total += l.commonMistakes?.length ?? 0
      else if (key === 'mnemonics') total += l.mnemonics?.length ?? 0
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

export function QuickRevisionHub({ notes }: { notes: SubjectNotes }) {
  const [active, setActive] = useState<Tab>('revision')
  const visibleTabs = TABS.filter((t) => t.count(notes) > 0)

  const totalFormulas = countAll(notes, 'formulas')
  const totalConcepts = countAll(notes, 'keyConcepts')
  const totalQuizzes = countAll(notes, 'practiceQuestions')
  const totalFlashcards = countAll(notes, 'flashcards')

  return (
    <section>
      <div className="notes-hub">
        {/* Header — concise revision hub */}
        <div className="notes-hub__header">
          <div className="notes-hub__title-row">
            <div className="notes-hub__icon-wrap">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="notes-hub__title">Quick Revision Hub</h2>
              <p className="notes-hub__subtitle">
                Concise revision material — formulas, key concepts, viva &amp; interview questions, common mistakes, memory tricks, and PYQs. For the complete interactive textbook, visit the Materials section.
              </p>
            </div>
          </div>
          <div className="notes-hub__stats">
            {totalFormulas > 0 && (
              <span className="notes-hub__stat">
                <Zap className="h-3 w-3" />
                {totalFormulas} formulas
              </span>
            )}
            {totalConcepts > 0 && (
              <span className="notes-hub__stat">
                <BookOpen className="h-3 w-3" />
                {totalConcepts} concepts
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

        {/* Tab bar */}
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

        {/* Tab content */}
        <div className="notes-hub__content">
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

          {active === 'concepts' && (
            <div className="space-y-3">
              {notes.units.map((u) => {
                const lessonsWithConcepts = u.lessons.filter((l) => (l.keyConcepts?.length ?? 0) > 0)
                if (lessonsWithConcepts.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithConcepts.map((l) => (
                        <div key={l.slug} className="mb-3 last:mb-0">
                          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{l.title}</p>
                          <div className="grid gap-1.5 sm:grid-cols-2">
                            {l.keyConcepts!.map((c, i) => (
                              <div key={i} className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                                {c}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'mistakes' && (
            <div className="space-y-3">
              {notes.units.map((u) => {
                const lessonsWithMistakes = u.lessons.filter((l) => (l.commonMistakes?.length ?? 0) > 0)
                if (lessonsWithMistakes.length === 0) return null
                return (
                  <div key={u.number} className="unit-group">
                    <div className="unit-group__header">
                      <div className="unit-group__title">
                        <span className="unit-group__badge">U{u.number}</span>
                        {u.title}
                      </div>
                    </div>
                    <div className="unit-group__body">
                      {lessonsWithMistakes.map((l) => (
                        <div key={l.slug} className="mb-3 last:mb-0">
                          <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{l.title}</p>
                          <ul className="space-y-1">
                            {l.commonMistakes!.map((m, i) => (
                              <li key={i} className="flex gap-2 text-xs text-foreground">
                                <span className="text-red-500 shrink-0">✗</span>
                                <span>{m}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {active === 'mnemonics' && (
            <div className="space-y-3">
              {notes.units.flatMap((u) =>
                u.lessons
                  .filter((l) => (l.mnemonics?.length ?? 0) > 0)
                  .map((l) => (
                    <div key={l.slug}>
                      <p className="mb-2 text-xs font-semibold text-muted-foreground">{l.title}</p>
                      <MnemonicList items={l.mnemonics!} />
                    </div>
                  )),
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
                      Subject Interview Bank
                    </div>
                  </div>
                  <div className="unit-group__body">
                    <MarkedQuestionList questions={notes.interviewBank} />
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'viva' && (
            <div className="space-y-3">
              {notes.vivaBank && notes.vivaBank.length > 0 && (
                <div className="unit-group">
                  <div className="unit-group__header">
                    <div className="unit-group__title">
                      <span className="unit-group__badge">★</span>
                      Subject Viva Bank
                    </div>
                  </div>
                  <div className="unit-group__body">
                    <MarkedQuestionList questions={notes.vivaBank} />
                  </div>
                </div>
              )}
            </div>
          )}

          {active === 'pyq' && notes.pyqBank && (
            <div>
              <div className="pyq-banner">
                <div className="pyq-banner__icon">
                  <Star className="h-4 w-4" />
                </div>
                <p className="pyq-banner__text">
                  Previous Year Questions — practice these for exam readiness.
                </p>
              </div>
              <MarkedQuestionList questions={notes.pyqBank} />
            </div>
          )}

          {active === 'quizzes' && (
            <div className="space-y-4">
              {notes.units.map((u) =>
                u.lessons
                  .filter((l) => (l.practiceQuestions?.length ?? 0) > 0)
                  .map((l) => (
                    <div key={l.slug}>
                      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        {l.title}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                          {l.practiceQuestions!.length} Qs
                        </span>
                      </h4>
                      <PracticeQuiz questions={l.practiceQuestions!} />
                    </div>
                  )),
              )}
            </div>
          )}

          {active === 'flashcards' && (
            <div className="space-y-4">
              {notes.units.map((u) =>
                u.lessons
                  .filter((l) => (l.flashcards?.length ?? 0) > 0)
                  .map((l) => (
                    <div key={l.slug}>
                      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Layers className="h-3.5 w-3.5" />
                        {l.title}
                        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                          {l.flashcards!.length} cards
                        </span>
                      </h4>
                      <MiniFlashcardGrid cards={l.flashcards!} />
                    </div>
                  )),
              )}
            </div>
          )}

          {active === 'ai' && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15">
                  <Bot className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold">AI Tutor for {notes.subjectName}</h3>
                  <p className="text-xs text-muted-foreground">Ask LEO anything about this subject</p>
                </div>
              </div>
              <Link
                href={`/tutor?subject=${encodeURIComponent(notes.subjectName)}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
              >
                <Bot className="h-4 w-4" />
                Open LEO AI Tutor
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
