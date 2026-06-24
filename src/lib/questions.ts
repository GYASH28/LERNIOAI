/**
 * Safe question DTOs — strip correct answers before sending to the browser.
 *
 * Practice DTO: includes hint but NOT correctAnswer/explanation.
 * Exam DTO:     includes NOTHING about the answer.
 * Review DTO:   full record, only returned AFTER a valid scored submission.
 */
import type { Question } from '@prisma/client'

export interface PracticeQuestionDTO {
  id: string
  type: string
  difficulty: string
  question: string
  options: string[] | null
  marks: number
  topicId: string | null
  subjectId: string
  unitNumber: number | null
}

export interface ExamQuestionDTO {
  id: string
  type: string
  difficulty: string
  question: string
  options: string[] | null
  marks: number
  negativeMark: number
  subjectId: string
  unitNumber: number | null
}

export interface ReviewQuestionDTO extends PracticeQuestionDTO {
  correctAnswer: string | null
  explanation: string | null
  hint: string | null
}

function parseOptions(optionsJson: string | null): string[] | null {
  if (!optionsJson) return null
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed.map(String) : null
  } catch {
    return null
  }
}

/** Practice: student may see hint later but never the answer upfront. */
export function toPracticeDTO(q: Question): PracticeQuestionDTO {
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    question: q.question,
    options: parseOptions(q.options),
    marks: q.marks,
    topicId: q.topicId,
    subjectId: q.subjectId,
    unitNumber: q.unitNumber,
  }
}

/** Exam: no hint, no answer, no explanation. */
export function toExamDTO(q: Question): ExamQuestionDTO {
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    question: q.question,
    options: parseOptions(q.options),
    marks: q.marks,
    negativeMark: q.negativeMark,
    subjectId: q.subjectId,
    unitNumber: q.unitNumber,
  }
}

/** Review: full record — only after server-scored submission. */
export function toReviewDTO(q: Question): ReviewQuestionDTO {
  return {
    id: q.id,
    type: q.type,
    difficulty: q.difficulty,
    question: q.question,
    options: parseOptions(q.options),
    marks: q.marks,
    topicId: q.topicId,
    subjectId: q.subjectId,
    unitNumber: q.unitNumber,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    hint: q.hint,
  }
}

/**
 * Server-side correctness evaluation.
 * For MCQ: compare parsed index. For true_false/short/long: normalised text compare.
 */
export function evaluateAnswer(
  question: Question,
  userAnswer: string | null,
): { isCorrect: boolean; correctAnswer: string | null } {
  if (!userAnswer) return { isCorrect: false, correctAnswer: question.correctAnswer }

  if (question.type === 'mcq') {
    // correctAnswer stores the index as a string
    const correctIdx = parseInt(question.correctAnswer ?? '', 10)
    const userIdx = parseInt(userAnswer, 10)
    return {
      isCorrect: !isNaN(correctIdx) && !isNaN(userIdx) && correctIdx === userIdx,
      correctAnswer: question.correctAnswer,
    }
  }

  if (question.type === 'true_false') {
    const norm = (s: string) => s.trim().toLowerCase()
    return {
      isCorrect: norm(userAnswer) === norm(question.correctAnswer ?? ''),
      correctAnswer: question.correctAnswer,
    }
  }

  // short_answer / long_answer — keyword-included heuristic (conservative).
  // Real rubric evaluation is handled by the AI evaluator for long answers.
  const correct = (question.correctAnswer ?? '').toLowerCase()
  const answer = userAnswer.toLowerCase()
  const keywords = correct
    .split(/[\s,;.]+/)
    .filter((w) => w.length > 3)
    .slice(0, 8)
  const matched = keywords.filter((k) => answer.includes(k)).length
  return {
    isCorrect: keywords.length > 0 && matched / keywords.length >= 0.6,
    correctAnswer: question.correctAnswer,
  }
}
