'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Code2, Lightbulb, AlertTriangle, GraduationCap } from 'lucide-react'

interface PracticeQuestion {
  question: string
  options: string[]
  answer: number
  explanation: string
}

interface CodeExample {
  language: string
  title: string
  code: string
  explanation: string
}

interface DataTable {
  title: string
  headers: string[]
  rows: string[][]
  note?: string
}

interface Diagram {
  type: string
  title: string
  content: string
}

interface LessonNoteSection {
  type: string
  title: string
  content: string
}

interface Lesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string
  overview: string
  keyConcepts: string[]
  formulas: string[]
  tables: DataTable[]
  diagrams: Diagram[]
  codeExamples: CodeExample[]
  commonMistakes: string[]
  examTips: string[]
  practiceQuestions: PracticeQuestion[]
}

interface Unit {
  number: number
  title: string
  weightage: number
  lessons: Lesson[]
}

interface SubjectNotes {
  subjectCode: string
  subjectName: string
  semester: number
  credits: number
  units: Unit[]
}

/**
 * Rich lesson notes renderer with:
 * - Overview section
 * - Key concepts (bullet list)
 * - Formulas (highlighted box)
 * - Data tables (styled)
 * - ASCII diagrams (monospace block)
 * - Code examples (syntax-highlighted)
 * - Common mistakes (warning box)
 * - Exam tips (info box)
 * - Interactive practice quiz
 */
export function LessonNotesRenderer({ notes }: { notes: SubjectNotes }) {
  const [expandedUnit, setExpandedUnit] = useState<number | null>(0)
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      {notes.units.map((unit) => (
        <div key={unit.number} className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Unit header */}
          <button
            onClick={() => setExpandedUnit(expandedUnit === unit.number ? null : unit.number)}
            className="flex w-full items-center justify-between p-4 text-left hover:bg-accent/5 transition-colors"
          >
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Unit {unit.number} · {unit.weightage}% weightage</p>
              <h3 className="mt-1 text-base font-semibold">{unit.title}</h3>
            </div>
            {expandedUnit === unit.number ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {/* Lessons */}
          {expandedUnit === unit.number && (
            <div className="border-t border-border divide-y divide-border">
              {unit.lessons.map((lesson) => (
                <div key={lesson.slug}>
                  <button
                    onClick={() => setExpandedLesson(expandedLesson === lesson.slug ? null : lesson.slug)}
                    className="flex w-full items-center justify-between p-3 pl-6 text-left hover:bg-accent/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.durationMin} min · {lesson.difficulty}</p>
                    </div>
                    {expandedLesson === lesson.slug ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>

                  {expandedLesson === lesson.slug && (
                    <div className="p-4 pl-6 space-y-6 bg-muted/20">
                      {/* Overview */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Overview</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lesson.overview}</p>
                      </div>

                      {/* Key Concepts */}
                      {lesson.keyConcepts.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <Lightbulb className="h-4 w-4 text-amber-500" />
                            Key Concepts
                          </h4>
                          <ul className="space-y-1.5">
                            {lesson.keyConcepts.map((concept, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-primary shrink-0">•</span>
                                <span>{concept}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Formulas */}
                      {lesson.formulas.length > 0 && (
                        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                          <h4 className="text-sm font-semibold mb-2 text-primary">Formulas</h4>
                          <div className="space-y-1.5">
                            {lesson.formulas.map((formula, i) => (
                              <p key={i} className="text-sm font-mono text-foreground">{formula}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tables */}
                      {lesson.tables.map((table, i) => (
                        <div key={i}>
                          <h4 className="text-sm font-semibold mb-2">{table.title}</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border border-border rounded-md overflow-hidden">
                              <thead className="bg-primary/10">
                                <tr>
                                  {table.headers.map((header, j) => (
                                    <th key={j} className="px-3 py-2 text-left font-semibold border-b border-border">{header}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {table.rows.map((row, j) => (
                                  <tr key={j} className={j % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                                    {row.map((cell, k) => (
                                      <td key={k} className="px-3 py-2 border-b border-border/50 font-mono">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {table.note && <p className="mt-1 text-xs text-muted-foreground italic">{table.note}</p>}
                        </div>
                      ))}

                      {/* Diagrams */}
                      {lesson.diagrams.map((diagram, i) => (
                        <div key={i}>
                          <h4 className="text-sm font-semibold mb-2">{diagram.title}</h4>
                          <pre className="rounded-md border border-border bg-muted/50 p-3 text-xs font-mono overflow-x-auto whitespace-pre">{diagram.content}</pre>
                        </div>
                      ))}

                      {/* Code Examples */}
                      {lesson.codeExamples.map((example, i) => (
                        <div key={i}>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <Code2 className="h-4 w-4 text-green-500" />
                            {example.title}
                          </h4>
                          <pre className="rounded-md border border-border bg-zinc-900 text-zinc-100 p-3 text-xs font-mono overflow-x-auto whitespace-pre">{example.code}</pre>
                          <p className="mt-1.5 text-xs text-muted-foreground">{example.explanation}</p>
                        </div>
                      ))}

                      {/* Common Mistakes */}
                      {lesson.commonMistakes.length > 0 && (
                        <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            Common Mistakes
                          </h4>
                          <ul className="space-y-1">
                            {lesson.commonMistakes.map((mistake, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-red-500 shrink-0">✗</span>
                                <span>{mistake}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Exam Tips */}
                      {lesson.examTips.length > 0 && (
                        <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-blue-600">
                            <GraduationCap className="h-4 w-4" />
                            Exam Tips
                          </h4>
                          <ul className="space-y-1">
                            {lesson.examTips.map((tip, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-blue-500 shrink-0">→</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Practice Quiz */}
                      {lesson.practiceQuestions.length > 0 && (
                        <PracticeQuiz questions={lesson.practiceQuestions} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
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
    if (index === question.answer) {
      setScore(score + 1)
    }
  }

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setCompleted(true)
    } else {
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
      <div className="rounded-md border border-green-500/20 bg-green-500/5 p-4 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
        <p className="mt-2 text-lg font-bold">Quiz Complete!</p>
        <p className="text-sm text-muted-foreground">
          You scored {score} / {questions.length} ({Math.round((score / questions.length) * 100)}%)
        </p>
        <button
          onClick={handleRestart}
          className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <GraduationCap className="h-4 w-4 text-primary" />
          Practice Quiz
        </h4>
        <span className="text-xs text-muted-foreground">
          Question {currentQ + 1} / {questions.length} · Score: {score}
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
            <span className="font-semibold">{selectedAnswer === question.answer ? '✓ Correct! ' : '✗ Wrong. '}</span>
            {question.explanation}
          </p>
          <button
            onClick={handleNext}
            className="mt-2 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {currentQ + 1 >= questions.length ? 'Finish' : 'Next Question →'}
          </button>
        </div>
      )}
    </div>
  )
}
