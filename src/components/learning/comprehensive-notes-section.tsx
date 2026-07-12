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
  /** Returns the count of items in this tab (for the badge). */
  count: (n: SubjectNotes) => number
}

const TABS: TabDef[] = [
  { id: 'lessons', label: 'Lesson Notes', icon: NotebookPen, count: (n) => n.units.reduce((s, u) => s + u.lessons.length, 0) },
  { id: 'revision', label: 'Revision Notes', icon: FileText, count: (n) => (n.revisionNotes ? 1 : 0) },
  { id: 'formulas', label: 'Formulas', icon: Zap, count: (n) => countAll(n, 'formulas') },
  { id: 'interview', label: 'Interview Q', icon: Briefcase, count: (n) => (n.interviewBank?.length ?? 0) + countMarked(n, 'interviewQuestions') },
  { id: 'viva', label: 'Viva Q', icon: MessageCircle, count: (n) => (n.vivaBank?.length ?? 0) + countMarked(n, 'vivaQuestions') },
  { id: 'pyq', label: 'PYQs', icon: Award, count: (n) => n.pyqBank?.length ?? 0 },
  { id: 'quizzes', label: 'Quizzes', icon: ListChecks, count: (n) => countAll(n, 'practiceQuestions') },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, count: (n) => countAll(n, 'flashcards') },
  { id: 'ai', label: 'AI Shortcuts', icon: Bot, count: () => 1 },
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

  // Filter tabs to only those with content
  const visibleTabs = TABS.filter((t) => t.count(notes) > 0)

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Complete Notes Hub</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Lesson notes, revision notes, formulas, interview & viva questions, quizzes, flashcards, and previous-year questions — all in one place.
      </p>

      {/* Tab bar */}
      <div className="notes-tabs" role="tablist">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const count = tab.count(notes)
          return (
            <button
              key={tab.id}
              role="tab"
              data-active={active === tab.id ? 'true' : undefined}
              onClick={() => setActive(tab.id)}
              className="notes-tabs__tab"
              type="button"
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {count}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {active === 'lessons' && <LessonNotesRenderer notes={notes} />}

        {active === 'revision' && notes.revisionNotes && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <MarkdownRenderer content={notes.revisionNotes} />
          </div>
        )}

        {active === 'formulas' && (
          <div className="space-y-3">
            {notes.units.flatMap((u) =>
              u.lessons.flatMap((l) =>
                (l.formulas ?? []).map((f, i) => (
                  <div
                    key={`${l.slug}-${i}`}
                    className="rounded-md border border-primary/20 bg-primary/5 p-3"
                  >
                    <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {l.title}
                    </p>
                    <p className="mt-1 font-mono text-sm text-foreground">{f}</p>
                  </div>
                )),
              ),
            )}
          </div>
        )}

        {active === 'interview' && (
          <div className="space-y-3">
            {notes.interviewBank && notes.interviewBank.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Subject-level Interview Bank
                </h3>
                <MarkedQuestionList questions={notes.interviewBank} />
              </div>
            )}
            {notes.units.map((u) =>
              u.lessons
                .filter((l) => (l.interviewQuestions?.length ?? 0) > 0)
                .map((l) => (
                  <div key={l.slug}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {l.title}
                    </h3>
                    <MarkedQuestionList questions={l.interviewQuestions!} />
                  </div>
                )),
            )}
          </div>
        )}

        {active === 'viva' && (
          <div className="space-y-3">
            {notes.vivaBank && notes.vivaBank.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                  Subject-level Viva Bank
                </h3>
                <MarkedQuestionList questions={notes.vivaBank} />
              </div>
            )}
            {notes.units.map((u) =>
              u.lessons
                .filter((l) => (l.vivaQuestions?.length ?? 0) > 0)
                .map((l) => (
                  <div key={l.slug}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {l.title}
                    </h3>
                    <MarkedQuestionList questions={l.vivaQuestions!} />
                  </div>
                )),
            )}
          </div>
        )}

        {active === 'pyq' && notes.pyqBank && (
          <div>
            <div className="mb-3 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-400">
              <Star className="h-4 w-4" />
              <p className="text-xs font-semibold">
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
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      {l.title}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({l.practiceQuestions!.length} questions)
                      </span>
                    </h3>
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
                    <h3 className="mb-2 text-sm font-semibold text-foreground">
                      {l.title}{' '}
                      <span className="text-xs text-muted-foreground">
                        ({l.flashcards!.length} cards)
                      </span>
                    </h3>
                    <MiniFlashcardGrid cards={l.flashcards!} />
                  </div>
                )),
            )}
          </div>
        )}

        {active === 'ai' && (
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-5 w-5 text-violet-500" />
              <h3 className="text-base font-semibold">AI Shortcuts for {notes.subjectName}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Open any lesson to access the AI toolbar with these actions:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'Explain', desc: 'Full deep explanation of any lesson', href: '#', icon: Bot },
                { label: 'Simplify', desc: 'Easy version with real-life analogy', href: '#', icon: FileText },
                { label: 'Hinglish', desc: 'Explanation in Hinglish', href: '#', icon: MessageCircle },
                { label: 'Marathi', desc: 'Explanation in Marathi', href: '#', icon: MessageCircle },
                { label: 'ELI10', desc: 'Explain like you are 10', href: '#', icon: Bot },
                { label: 'Examples', desc: '3 worked examples per topic', href: '#', icon: Star },
                { label: 'Coding Exercise', desc: 'AI-generated coding problem', href: '#', icon: ListChecks },
                { label: 'Quiz', desc: '5 MCQs with answers', href: '#', icon: ListChecks },
                { label: 'Flashcards', desc: '6 active-recall flashcards', href: '#', icon: Layers },
                { label: 'Summary', desc: 'One-page revision note', href: '#', icon: FileText },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.label}
                    className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5"
                  >
                    <Icon className="h-4 w-4 text-violet-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <a
              href={`/tutor?subject=${encodeURIComponent(notes.subjectName)}`}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Bot className="h-4 w-4" />
              Open LEO AI Tutor
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </section>
  )
}
