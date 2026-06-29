import { describe, expect, it } from 'vitest'
import { LessonNoteDocumentSchema, renderLessonNoteHtml, type LessonNoteDocument } from './lesson-note-document'

const validDocument: LessonNoteDocument = {
  documentType: 'lesson_notes',
  templateVersion: 'lesson-notes-v1',
  verificationStatus: 'ready_for_review',
  programmeCode: 'DCOMP',
  semesterNumber: 2,
  subjectCode: 'R23CP1201',
  unitNumber: 1,
  lessonSlug: '1-structure-of-a-c-program--lesson_1',
  lessonTitle: 'Structure of a C Program',
  version: 1,
  deepLink: 'https://lernio.example/learn/DCOMP/semester/2/subject/R23CP1201/lesson/1-structure-of-a-c-program--lesson_1',
  learningOutcomes: ['Explain the parts of a simple C program.'],
  prerequisites: ['Basic computer usage'],
  conceptMapAlt: 'Source code flows through preprocessing, compilation, linking, and execution.',
  sections: [
    {
      id: 'program-parts',
      title: 'Program Parts',
      body: 'A C program usually contains headers, main function, declarations, statements, and return value.',
      citationIds: ['official-1'],
    },
  ],
  workedExamples: [
    {
      title: 'Hello World',
      problem: 'Identify the main function.',
      solutionSteps: ['Find int main().', 'Read the statements inside braces.'],
      finalAnswer: 'The program starts executing from main().',
      citationIds: ['official-1'],
    },
  ],
  commonMistakes: ['Missing semicolon after printf.'],
  examTips: ['Draw a labelled structure before writing the answer.'],
  practiceSet: [
    {
      question: 'Where does execution begin?',
      answer: 'main()',
      explanation: 'The runtime calls main as the entry point.',
      difficulty: 'easy',
    },
  ],
  glossary: [{ term: 'Header', definition: 'A file included before compilation for declarations.' }],
  sources: [
    {
      id: 'official-1',
      label: 'CWIT R23 Computer Engineering curriculum',
      sourceType: 'official_curriculum',
      url: 'https://cwit.mespune.org/wp-content/uploads/2021/07/COMPUTER-MPECS-23-CURRICULUM.pdf',
    },
  ],
}

describe('LessonNoteDocumentSchema', () => {
  it('accepts a complete lesson note document', () => {
    expect(LessonNoteDocumentSchema.safeParse(validDocument).success).toBe(true)
  })

  it('rejects citations that do not resolve to declared sources', () => {
    const result = LessonNoteDocumentSchema.safeParse({
      ...validDocument,
      sections: [{ ...validDocument.sections[0], citationIds: ['missing-source'] }],
    })

    expect(result.success).toBe(false)
  })
})

describe('renderLessonNoteHtml', () => {
  it('renders print-safe HTML and escapes unsafe content', () => {
    const parsed = LessonNoteDocumentSchema.parse({
      ...validDocument,
      lessonTitle: '<script>alert(1)</script>',
    })

    const html = renderLessonNoteHtml(parsed)

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('Learning Outcomes')
    expect(html).toContain('Sources')
    expect(html).not.toContain('<script>alert(1)</script>')
  })
})
