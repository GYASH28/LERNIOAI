import type { Lesson } from './lesson-notes-loader'

export type MaterialsPhaseId = 'learn' | 'simplify' | 'visualise' | 'practise' | 'revise'

export interface MaterialsLearningPhase {
  id: MaterialsPhaseId
  label: string
  eyebrow: string
  description: string
  completionPrompt: string
  sectionIds: readonly string[]
}

export const MATERIALS_PHASES: readonly MaterialsLearningPhase[] = [
  {
    id: 'learn',
    label: 'Learn',
    eyebrow: 'Build the foundation',
    description: 'Start with the outcome, prerequisites, core explanation and essential ideas.',
    completionPrompt: 'I understand the main idea',
    sectionIds: ['overview', 'objectives', 'prerequisites', 'theory', 'concepts', 'callouts'],
  },
  {
    id: 'simplify',
    label: 'Simplify',
    eyebrow: 'Make it click',
    description: 'Use analogies, guided examples and common mistakes to remove the difficult parts.',
    completionPrompt: 'The idea makes sense now',
    sectionIds: ['analogies', 'worked', 'mistakes'],
  },
  {
    id: 'visualise',
    label: 'Visualise',
    eyebrow: 'See how it works',
    description: 'Study the flow, structure, comparisons, diagrams and code behind the concept.',
    completionPrompt: 'I can picture the process',
    sectionIds: ['flowcharts', 'mindmaps', 'diagrams', 'tables', 'code', 'complexity'],
  },
  {
    id: 'practise',
    label: 'Practise',
    eyebrow: 'Turn knowledge into recall',
    description: 'Answer questions, check explanations and prepare for viva, interview and exam formats.',
    completionPrompt: 'I can answer this myself',
    sectionIds: ['quiz', 'viva', 'interview', 'exam'],
  },
  {
    id: 'revise',
    label: 'Revise',
    eyebrow: 'Lock it in',
    description: 'Compress the lesson into formulas, a summary, memory cues and active-recall cards.',
    completionPrompt: 'This is ready for revision',
    sectionIds: ['summary', 'formulas', 'cheatsheet', 'mnemonics', 'flashcards', 'ai-summaries'],
  },
] as const

const SECTION_HAS_CONTENT: Record<string, (lesson: Lesson) => boolean> = {
  overview: (lesson) => Boolean(lesson.overview?.trim()),
  objectives: (lesson) => Boolean(lesson.objectives?.length),
  prerequisites: (lesson) => Boolean(lesson.prerequisites?.length),
  theory: (lesson) => Boolean(lesson.theory?.trim()),
  concepts: (lesson) => Boolean(lesson.keyConcepts?.length),
  analogies: (lesson) => Boolean(lesson.analogies?.length),
  worked: (lesson) => Boolean(lesson.workedExamples?.length),
  callouts: (lesson) => Boolean(lesson.callouts?.length),
  mistakes: (lesson) => Boolean(lesson.commonMistakes?.length),
  flowcharts: (lesson) => Boolean(lesson.flowcharts?.length),
  mindmaps: (lesson) => Boolean(lesson.mindMaps?.length),
  diagrams: (lesson) => Boolean(lesson.diagrams?.length),
  tables: (lesson) => Boolean(lesson.tables?.length),
  code: (lesson) => Boolean(lesson.codeExamples?.length),
  complexity: (lesson) => Boolean(lesson.complexity),
  quiz: (lesson) => Boolean(lesson.practiceQuestions?.length),
  viva: (lesson) => Boolean(lesson.vivaQuestions?.length),
  interview: (lesson) => Boolean(lesson.interviewQuestions?.length),
  exam: (lesson) => Boolean(lesson.examQuestions?.length),
  summary: (lesson) => Boolean(lesson.revisionSummary?.trim()),
  formulas: (lesson) => Boolean(lesson.formulas?.length),
  cheatsheet: (lesson) => Boolean(lesson.cheatSheet?.length),
  mnemonics: (lesson) => Boolean(lesson.mnemonics?.length),
  flashcards: (lesson) => Boolean(lesson.flashcards?.length),
  'ai-summaries': (lesson) => Boolean(lesson.aiSummaries?.length),
}

export function getMaterialsPhase(value: string | null | undefined): MaterialsLearningPhase {
  return MATERIALS_PHASES.find((phase) => phase.id === value) ?? MATERIALS_PHASES[0]
}

export function getAvailableMaterialsPhases(lesson: Lesson): MaterialsPhaseId[] {
  return MATERIALS_PHASES
    .filter((phase) => phase.sectionIds.some((sectionId) => SECTION_HAS_CONTENT[sectionId]?.(lesson)))
    .map((phase) => phase.id)
}
