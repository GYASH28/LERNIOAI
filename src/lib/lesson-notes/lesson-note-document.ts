import { z } from 'zod'

const LegacyMarkedQuestionSchema = z.object({
  marks: z.number().nonnegative(),
  question: z.string().trim().min(1),
  modelAnswer: z.string().trim().min(1).optional(),
  tips: z.array(z.string().trim().min(1)).optional(),
})

const LegacyLessonSchema = z.object({
  slug: z.string().trim().min(1),
  title: z.string().trim().min(1),
  durationMin: z.number().int().positive(),
  difficulty: z.string().trim().min(1),
  overview: z.string().trim().min(1),
  keyConcepts: z.array(z.string().trim().min(1)),
  formulas: z.array(z.string().trim().min(1)),
  tables: z.array(z.unknown()).optional(),
  codeExamples: z.array(z.unknown()).optional(),
  commonMistakes: z.array(z.string().trim().min(1)),
  examTips: z.array(z.string().trim().min(1)),
  practiceQuestions: z.array(z.unknown()),
}).passthrough()

/**
 * Existing curriculum content is stored one subject per file. It remains a
 * supported input format while the newer generated artifacts use the
 * lesson-level schema below.
 */
export const LegacySubjectNotesSchema = z.object({
  subjectCode: z.string().trim().min(1),
  subjectName: z.string().trim().min(1),
  semester: z.number().int().min(1).max(8),
  credits: z.number().nonnegative(),
  units: z.array(z.object({
    number: z.number().int().positive(),
    title: z.string().trim().min(1),
    weightage: z.number().nonnegative(),
    lessons: z.array(LegacyLessonSchema).min(1),
  })).min(1),
  revisionNotes: z.string().optional(),
  interviewBank: z.array(LegacyMarkedQuestionSchema).optional(),
  vivaBank: z.array(LegacyMarkedQuestionSchema).optional(),
  pyqBank: z.array(LegacyMarkedQuestionSchema).optional(),
}).passthrough()

export const LessonNoteSourceSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
  url: z.string().trim().url().optional(),
  sourceType: z.enum(['official_curriculum', 'approved_video', 'approved_reference', 'teacher_note', 'generated_summary']),
})

export const LessonNoteSectionSchema = z.object({
  id: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  citationIds: z.array(z.string().trim().min(1)).default([]),
})

export const LessonNoteWorkedExampleSchema = z.object({
  title: z.string().trim().min(1),
  problem: z.string().trim().min(1),
  solutionSteps: z.array(z.string().trim().min(1)).min(1),
  finalAnswer: z.string().trim().min(1),
  citationIds: z.array(z.string().trim().min(1)).default([]),
})

export const LessonNotePracticeItemSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  explanation: z.string().trim().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
})

export const LessonNoteDocumentSchema = z
  .object({
    documentType: z.enum(['lesson_notes', 'quick_notes', 'revision_sheet', 'formula_sheet']),
    templateVersion: z.string().trim().min(1),
    verificationStatus: z.enum(['draft', 'validation_failed', 'ready_for_review', 'approved', 'published']),
    programmeCode: z.string().trim().min(1),
    semesterNumber: z.number().int().min(1).max(8),
    subjectCode: z.string().trim().min(1),
    unitNumber: z.number().int().min(1).max(20),
    lessonSlug: z.string().trim().min(1),
    lessonTitle: z.string().trim().min(1),
    version: z.number().int().min(1),
    deepLink: z.string().trim().url(),
    learningOutcomes: z.array(z.string().trim().min(1)).min(1),
    prerequisites: z.array(z.string().trim().min(1)).default([]),
    conceptMapAlt: z.string().trim().min(1).optional(),
    sections: z.array(LessonNoteSectionSchema).min(1),
    workedExamples: z.array(LessonNoteWorkedExampleSchema).default([]),
    commonMistakes: z.array(z.string().trim().min(1)).default([]),
    examTips: z.array(z.string().trim().min(1)).default([]),
    practiceSet: z.array(LessonNotePracticeItemSchema).default([]),
    glossary: z.array(z.object({
      term: z.string().trim().min(1),
      definition: z.string().trim().min(1),
    })).default([]),
    sources: z.array(LessonNoteSourceSchema).min(1),
  })
  .superRefine((document, ctx) => {
    const sourceIds = new Set(document.sources.map((source) => source.id))
    const citationIds = [
      ...document.sections.flatMap((section) => section.citationIds),
      ...document.workedExamples.flatMap((example) => example.citationIds),
    ]

    for (const citationId of citationIds) {
      if (!sourceIds.has(citationId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Citation "${citationId}" does not match a declared source.`,
          path: ['sources'],
        })
      }
    }
  })

export const LessonNoteContentSchema = z.union([
  LessonNoteDocumentSchema,
  LegacySubjectNotesSchema,
])

export type LessonNoteDocument = z.infer<typeof LessonNoteDocumentSchema>

export function renderLessonNoteHtml(document: LessonNoteDocument): string {
  const sections = document.sections
    .map((section) => `
      <section id="${escapeAttribute(section.id)}">
        <h2>${escapeHtml(section.title)}</h2>
        ${renderParagraphs(section.body)}
        ${renderCitationList(section.citationIds, document.sources)}
      </section>
    `)
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(document.lessonTitle)} - Lernio Notes</title>
  <style>
    :root { color-scheme: light; font-family: Inter, system-ui, sans-serif; }
    body { margin: 0; color: #111827; background: #ffffff; line-height: 1.6; }
    main { max-width: 820px; margin: 0 auto; padding: 40px 28px; }
    header { border-bottom: 2px solid #111827; padding-bottom: 20px; margin-bottom: 28px; }
    h1 { font-size: 32px; line-height: 1.15; margin: 0 0 12px; }
    h2 { font-size: 22px; margin: 28px 0 10px; }
    h3 { font-size: 16px; margin: 18px 0 8px; }
    p, li { font-size: 14px; }
    .meta, .sources { color: #4b5563; font-size: 12px; }
    .panel { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin: 18px 0; }
    .citation { font-size: 12px; color: #374151; }
    @media print { main { padding: 24px 18px; } a { color: inherit; text-decoration: none; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="meta">${escapeHtml(document.programmeCode)} / Semester ${document.semesterNumber} / ${escapeHtml(document.subjectCode)} / Unit ${document.unitNumber}</p>
      <h1>${escapeHtml(document.lessonTitle)}</h1>
      <p class="meta">Version ${document.version} / ${escapeHtml(document.verificationStatus)} / ${escapeHtml(document.documentType.replace(/_/g, ' '))}</p>
      <p class="meta"><a href="${escapeAttribute(document.deepLink)}">${escapeHtml(document.deepLink)}</a></p>
    </header>

    <section>
      <h2>Learning Outcomes</h2>
      ${renderList(document.learningOutcomes)}
    </section>

    ${document.prerequisites.length ? `<section><h2>Prerequisites</h2>${renderList(document.prerequisites)}</section>` : ''}
    ${document.conceptMapAlt ? `<section class="panel"><h2>Concept Map</h2><p>${escapeHtml(document.conceptMapAlt)}</p></section>` : ''}

    ${sections}
    ${renderWorkedExamples(document)}
    ${renderListSection('Common Mistakes', document.commonMistakes)}
    ${renderListSection('Exam Tips', document.examTips)}
    ${renderPracticeSet(document)}
    ${renderGlossary(document)}
    ${renderSources(document)}
  </main>
</body>
</html>`
}

function renderWorkedExamples(document: LessonNoteDocument): string {
  if (document.workedExamples.length === 0) return ''
  return `<section><h2>Worked Examples</h2>${document.workedExamples.map((example) => `
    <article class="panel">
      <h3>${escapeHtml(example.title)}</h3>
      <p><strong>Problem:</strong> ${escapeHtml(example.problem)}</p>
      ${renderList(example.solutionSteps)}
      <p><strong>Answer:</strong> ${escapeHtml(example.finalAnswer)}</p>
      ${renderCitationList(example.citationIds, document.sources)}
    </article>
  `).join('')}</section>`
}

function renderPracticeSet(document: LessonNoteDocument): string {
  if (document.practiceSet.length === 0) return ''
  return `<section><h2>Practice Set</h2>${document.practiceSet.map((item, index) => `
    <article class="panel">
      <h3>Question ${index + 1} (${escapeHtml(item.difficulty)})</h3>
      <p>${escapeHtml(item.question)}</p>
      <p><strong>Answer:</strong> ${escapeHtml(item.answer)}</p>
      <p>${escapeHtml(item.explanation)}</p>
    </article>
  `).join('')}</section>`
}

function renderGlossary(document: LessonNoteDocument): string {
  if (document.glossary.length === 0) return ''
  return `<section><h2>Glossary</h2>${document.glossary.map((item) => `
    <p><strong>${escapeHtml(item.term)}:</strong> ${escapeHtml(item.definition)}</p>
  `).join('')}</section>`
}

function renderSources(document: LessonNoteDocument): string {
  return `<section class="sources"><h2>Sources</h2><ol>${document.sources.map((source) => `
    <li id="source-${escapeAttribute(source.id)}">${escapeHtml(source.label)}${source.url ? ` - <a href="${escapeAttribute(source.url)}">${escapeHtml(source.url)}</a>` : ''}</li>
  `).join('')}</ol></section>`
}

function renderListSection(title: string, items: string[]): string {
  if (items.length === 0) return ''
  return `<section><h2>${escapeHtml(title)}</h2>${renderList(items)}</section>`
}

function renderList(items: string[]): string {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
}

function renderParagraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
    .join('')
}

function renderCitationList(citationIds: string[], sources: LessonNoteDocument['sources']): string {
  if (citationIds.length === 0) return ''
  const labels = citationIds.map((id) => {
    const index = sources.findIndex((source) => source.id === id)
    return index >= 0 ? `<a href="#source-${escapeAttribute(id)}">[${index + 1}]</a>` : ''
  }).filter(Boolean)
  return labels.length ? `<p class="citation">Sources: ${labels.join(' ')}</p>` : ''
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
