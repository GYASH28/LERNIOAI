import { describe, expect, it } from 'vitest'
import {
  buildTutorSystemPrompt,
  createTutorSessionTitle,
  tutorMaxTokens,
  tutorModelProfile,
} from './tutor-runtime'

describe('tutor runtime policy', () => {
  it('routes short interactive work to the fast model', () => {
    expect(tutorModelProfile('explain_simple')).toBe('fast')
    expect(tutorModelProfile('hint_only')).toBe('fast')
    expect(tutorMaxTokens('hint_only')).toBeLessThan(tutorMaxTokens('explain_deep'))
  })

  it('routes accuracy-heavy work to the quality model', () => {
    expect(tutorModelProfile('explain_deep')).toBe('quality')
    expect(tutorModelProfile('exam_answer')).toBe('quality')
    expect(tutorModelProfile('debug_code')).toBe('quality')
  })

  it('creates compact safe session titles', () => {
    expect(createTutorSessionTitle('**Explain** arrays in C++')).toBe('Explain arrays in C++')
    expect(createTutorSessionTitle('x'.repeat(100))).toHaveLength(64)
  })

  it('marks missing retrieval context honestly', () => {
    const prompt = buildTutorSystemPrompt({
      mode: 'explain_simple',
      academicContext: 'Subject: OOP',
      contextBlock: '',
      citations: [],
    })
    expect(prompt).toContain('No verified course lesson was retrieved')
    expect(prompt).toContain('do not claim that the answer comes from Lernio notes')
  })

  it('restricts citations to retrieved sources', () => {
    const prompt = buildTutorSystemPrompt({
      mode: 'exam_answer',
      academicContext: 'Subject: OOP',
      contextBlock: '[1] Classes and objects',
      citations: [{ sourceId: 'lesson-1', title: 'Classes and objects' }],
    })
    expect(prompt).toContain('Cite only these sources using [1], [2]')
    expect(prompt).toContain('[1] Classes and objects')
  })
})
