import { describe, expect, it } from 'vitest'
import type { Lesson } from './lesson-notes-loader'
import {
  MATERIALS_PHASES,
  getAvailableMaterialsPhases,
  getMaterialsPhase,
} from './materials-learning-phases'

const lesson = {
  slug: 'arrays',
  title: 'Arrays',
  durationMin: 20,
  difficulty: 'medium',
  overview: 'An array stores related values in order.',
  objectives: ['Trace an array operation'],
  prerequisites: ['Variables'],
  theory: '## Array model',
  keyConcepts: ['Contiguous storage'],
  analogies: [{ scenario: 'Lockers', mapping: 'Each locker has an index.' }],
  workedExamples: [{ title: 'Lookup', problem: 'Read item 2', solution: 'a[2]' }],
  callouts: [{ type: 'tip', content: 'Indexes begin at zero.' }],
  flowcharts: [{ type: 'flowchart', title: 'Traversal', content: 'Start -> Visit -> End' }],
  mindMaps: [],
  tables: [],
  diagrams: [],
  codeExamples: [{ language: 'c', title: 'Array', code: 'int a[3];', explanation: 'Declares an array.' }],
  complexity: { time: 'O(1)', space: 'O(n)' },
  commonMistakes: ['Reading outside the bounds'],
  vivaQuestions: [{ marks: 2, question: 'What is an array?' }],
  interviewQuestions: [],
  examQuestions: [{ marks: 5, question: 'Explain array traversal.' }],
  formulas: ['address = base + index * size'],
  revisionSummary: 'Arrays use indexes.',
  cheatSheet: ['First index = 0'],
  mnemonics: [{ phrase: 'BIO', expansion: 'Bounds, Index, Order', meaning: 'Array checks' }],
  practiceQuestions: [{
    question: 'What is the first index?',
    options: ['0', '1'],
    answer: 0,
    explanation: 'Array indexing starts at zero.',
  }],
  flashcards: [{ front: 'First index?', back: '0' }],
  aiSummaries: [],
  examTips: [],
} satisfies Lesson

describe('materials learning phases', () => {
  it('keeps the five phases in the intended learning order', () => {
    expect(MATERIALS_PHASES.map((phase) => phase.id)).toEqual([
      'learn',
      'simplify',
      'visualise',
      'practise',
      'revise',
    ])
  })

  it('assigns different canonical note sections to each phase', () => {
    const sectionSets = MATERIALS_PHASES.map((phase) => phase.sectionIds.join(','))
    expect(new Set(sectionSets).size).toBe(MATERIALS_PHASES.length)
    expect(getMaterialsPhase('learn').sectionIds).toContain('theory')
    expect(getMaterialsPhase('simplify').sectionIds).toContain('analogies')
    expect(getMaterialsPhase('visualise').sectionIds).toContain('diagrams')
    expect(getMaterialsPhase('practise').sectionIds).toContain('quiz')
    expect(getMaterialsPhase('revise').sectionIds).toContain('flashcards')
  })

  it('reports which phases have real content without inventing availability', () => {
    expect(getAvailableMaterialsPhases(lesson)).toEqual([
      'learn',
      'simplify',
      'visualise',
      'practise',
      'revise',
    ])

    expect(getAvailableMaterialsPhases({
      ...lesson,
      analogies: [],
      workedExamples: [],
      callouts: [],
      commonMistakes: [],
    })).not.toContain('simplify')
  })

  it('falls back to Learn for invalid persisted phase values', () => {
    expect(getMaterialsPhase('something-old').id).toBe('learn')
    expect(getMaterialsPhase(null).id).toBe('learn')
  })
})
