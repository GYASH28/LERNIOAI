'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Code2,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Target,
  Zap,
  Table as TableIcon,
  ExternalLink,
} from 'lucide-react'
import type {
  PracticeQuestion,
  Lesson,
  Unit,
  SubjectNotes,
} from '@/lib/curriculum/lesson-notes-loader'
import { CodeBlock } from './code-block'
import { Callout } from './callout'

// Re-export for backward compat
export type { PracticeQuestion, Lesson, Unit, SubjectNotes }

/**
 * Premium accordion-style lesson notes renderer.
 * Used on the subject page "Complete Notes Hub" → Lessons tab.
 * Each lesson expands to show overview, objectives, key concepts,
 * formulas, tables, code examples (syntax-highlighted), callouts,
 * common mistakes, exam tips, and a link to open the full interactive
 * reader.
 */
export function LessonNotesRenderer({ notes }: { notes: SubjectNotes }) {
  const [expandedUnit, setExpandedUnit] = useState<number | null>(0)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  if (!notes?.units?.length) {
    return (
      <div className="notes-empty">
        <div className="notes-empty__icon">
          <BookOpen className="h-7 w-7" />
        </div>
        <p className="notes-empty__title">No notes available for this lesson</p>
        <p className="notes-empty__desc">
          Browse the subject materials or ask LEO for help with this topic.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notes.units.map((unit) => {
        const isUnitOpen = expandedUnit === unit.number
        return (
          <div key={unit.number} className="unit-group">
            {/* Unit header */}
            <button
              onClick={() => setExpandedUnit(isUnitOpen ? null : unit.number)}
              className="unit-group__header w-full text-left"
              type="button"
            >
              <div className="unit-group__title">
                <span className="unit-group__badge">U{unit.number}</span>
                <span>{unit.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="unit-group__weight">{unit.weightage}% · {unit.lessons.length} lessons</span>
                {isUnitOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Lessons */}
            {isUnitOpen && (
              <div className="unit-group__body">
                {unit.lessons.map((lesson, lessonIdx) => {
                  const lessonHref = buildLessonHref(notes, lesson)
                  const isLessonOpen = expandedLesson === lesson.slug
                  return (
                    <div key={lesson.slug} className="lesson-item">
                      <div className="lesson-item__header">
                        <button
                          onClick={() =>
                            setExpandedLesson(isLessonOpen ? null : lesson.slug)
                          }
                          className="lesson-item__toggle"
                          type="button"
                        >
                          <span className="lesson-item__number">{lessonIdx + 1}</span>
                          <div className="lesson-item__info">
                            <p className="lesson-item__title">{lesson.title}</p>
                            <div className="lesson-item__meta">
                              <span className="flex items-center gap-0.5">
                                <BookOpen className="h-3 w-3" />
                                {lesson.durationMin} min
                              </span>
                              <span>·</span>
                              <span className={`lesson-item__difficulty lesson-item__difficulty--${lesson.difficulty}`}>
                                {lesson.difficulty}
                              </span>
                            </div>
                          </div>
                          {isLessonOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        {lessonHref && (
                          <a
                            href={lessonHref}
                            className="lesson-item__open-btn"
                            title="Open full interactive notes"
                          >
                            Open
                            <ChevronRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* Expanded lesson body */}
                      {isLessonOpen && (
                        <div className="lesson-item__body">
                          {/* Overview */}
                          {lesson.overview && (
                            <div className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <BookOpen className="h-3.5 w-3.5" />
                                Overview
                              </div>
                              <p className="lesson-subsection__content text-muted-foreground leading-relaxed">
                                {lesson.overview}
                              </p>
                            </div>
                          )}

                          {/* Objectives */}
                          {lesson.objectives && lesson.objectives.length > 0 && (
                            <div className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <Target className="h-3.5 w-3.5" />
                                Learning Objectives
                              </div>
                              <ul className="space-y-1.5">
                                {lesson.objectives.map((o, i) => (
                                  <li key={i} className="flex gap-2 text-sm text-foreground">
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                                    <span>{o}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Key Concepts */}
                          {lesson.keyConcepts?.length ? (
                            <div className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <Lightbulb className="h-3.5 w-3.5" />
                                Key Concepts
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {lesson.keyConcepts.map((concept, i) => (
                                  <div
                                    key={i}
                                    className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-foreground"
                                  >
                                    {concept}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Formulas */}
                          {lesson.formulas?.length ? (
                            <div className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <Zap className="h-3.5 w-3.5" />
                                Formulas
                              </div>
                              <div className="space-y-1.5">
                                {lesson.formulas.map((formula, i) => (
                                  <div
                                    key={i}
                                    className="rounded-md border-l-[3px] border-primary bg-primary/5 px-3 py-2"
                                  >
                                    <p className="font-mono text-sm text-foreground">{formula}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {/* Tables */}
                          {(lesson.tables ?? []).map((table, i) => (
                            <div key={i} className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <TableIcon className="h-3.5 w-3.5" />
                                {table.title || `Table ${i + 1}`}
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                  <thead className="bg-primary/10">
                                    <tr>
                                      {table.headers.map((header, j) => (
                                        <th
                                          key={j}
                                          className="border-b border-border px-3 py-2 text-left font-semibold"
                                        >
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {table.rows.map((row, j) => (
                                      <tr
                                        key={j}
                                        className={j % 2 === 0 ? 'bg-card' : 'bg-muted/30'}
                                      >
                                        {row.map((cell, k) => (
                                          <td
                                            key={k}
                                            className="border-b border-border/50 px-3 py-2 align-top"
                                          >
                                            {cell}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {table.note && (
                                <p className="mt-1.5 text-xs italic text-muted-foreground">{table.note}</p>
                              )}
                            </div>
                          ))}

                          {/* Code Examples — syntax highlighted */}
                          {(lesson.codeExamples ?? []).map((example, i) => (
                            <div key={i} className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <Code2 className="h-3.5 w-3.5" />
                                {example.title}
                              </div>
                              <CodeBlock
                                code={example.code}
                                language={example.language}
                                title={example.title}
                                showLineNumbers
                                collapsible
                                collapseThreshold={15}
                              />
                              {example.explanation && (
                                <p className="mt-1.5 text-xs text-muted-foreground">{example.explanation}</p>
                              )}
                            </div>
                          ))}

                          {/* Callouts (from examTips + commonMistakes) */}
                          {lesson.examTips && lesson.examTips.length > 0 && (
                            <div className="lesson-subsection">
                              {lesson.examTips.slice(0, 2).map((tip, i) => (
                                <Callout key={i} type="exam-tip" content={tip} />
                              ))}
                            </div>
                          )}
                          {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
                            <div className="lesson-subsection">
                              {lesson.commonMistakes.slice(0, 2).map((m, i) => (
                                <Callout key={i} type="warning" content={m} />
                              ))}
                            </div>
                          )}

                          {/* Practice Quiz (inline, compact) */}
                          {lesson.practiceQuestions?.length ? (
                            <div className="lesson-subsection">
                              <div className="lesson-subsection__label">
                                <GraduationCap className="h-3.5 w-3.5" />
                                Quick Quiz ({lesson.practiceQuestions.length} questions)
                              </div>
                              <PracticeQuiz questions={lesson.practiceQuestions} />
                            </div>
                          ) : null}

                          {/* CTA — open full interactive reader */}
                          {lessonHref && (
                            <a
                              href={lessonHref}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open full interactive notes
                              <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function buildLessonHref(notes: SubjectNotes, lesson: Lesson): string | null {
  if (!notes?.subjectCode) return null
  const programmeCode = notes.programmeCode ?? (/^R23CI/i.test(notes.subjectCode) ? 'DCIOT' : 'DCOMP')
  return `/learn/${programmeCode}/semester/${notes.semester}/subject/${notes.subjectCode}/lesson/${lesson.slug}`
}

/**
 * Interactive practice quiz component.
 * Shows questions one at a time, provides instant feedback with explanations.
 */
function PracticeQuiz({ questions }: { questions: PracticeQuestion[] }) {
  const [currentQ, setCurrentQ] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)

  const question = questions[currentQ]
  if (!question) return null

  const handleSelect = (index: number) => {
    if (showResult) return
    setSelectedAnswer(index)
    setShowResult(true)
    if (index === question.answer) setScore(score + 1)
  }

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) setCompleted(true)
    else {
      setCurrentQ(currentQ + 1)
      setSelectedAnswer(null)
      setShowResult(false)
    }
  }

  const handleRestart = () => {
    setCurrentQ(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setScore(0)
    setCompleted(false)
  }

  if (completed) {
    return (
      <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="mt-2 text-lg font-bold">Quiz Complete!</p>
        <p className="text-sm text-muted-foreground">
          You scored {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
        </p>
        <button
          onClick={handleRestart}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          type="button"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-primary" />
          Practice Quiz
        </h4>
        <span className="text-xs text-muted-foreground">
          Q{currentQ + 1} / {questions.length} · Score: {score}
        </span>
      </div>
      <p className="mb-3 text-sm font-medium whitespace-pre-line">{question.question}</p>
      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = selectedAnswer === i
          const isCorrect = i === question.answer
          const showCorrect = showResult && isCorrect
          const showWrong = showResult && isSelected && !isCorrect
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={showResult}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                showCorrect
                  ? 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                  : showWrong
                    ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                    : 'border-border hover:bg-accent/50'
              } ${showResult ? 'cursor-default' : 'cursor-pointer'}`}
              type="button"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
              {showCorrect && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
              {showWrong && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
            </button>
          )
        })}
      </div>
      {showResult && (
        <div className="mt-3 rounded-md bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">
              {selectedAnswer === question.answer ? '✓ Correct! ' : '✗ Wrong. '}
            </span>
            {question.explanation}
          </p>
          <button
            onClick={handleNext}
            className="mt-2 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            type="button"
          >
            {currentQ + 1 >= questions.length ? 'Finish' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  )
}
