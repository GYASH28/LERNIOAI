import { describe, expect, it } from 'vitest'
import { mapCitationsToAnswer, polishTutorContent } from './groq-provider'

describe('polishTutorContent', () => {
  it('removes AI disclaimers while preserving the answer', () => {
    expect(polishTutorContent('As an AI, I can explain arrays simply.')).toBe(
      'I can explain arrays simply.',
    )
  })

  it('removes a leading thinking preface when a real answer heading follows', () => {
    const raw = [
      'Thinking: I should organize this for a diploma student.',
      '',
      '## Meaning',
      'An array stores same-type values in contiguous memory.',
    ].join('\n')

    expect(polishTutorContent(raw)).toBe(
      '## Meaning\nAn array stores same-type values in contiguous memory.',
    )
  })

  it('does not drop the answer when the thinking label contains the answer itself', () => {
    expect(polishTutorContent('Thinking: The key idea is binary search halves the search space.')).toBe(
      'The key idea is binary search halves the search space.',
    )
  })
})

describe('mapCitationsToAnswer', () => {
  const citations = [
    { sourceId: 'lesson-1', title: 'Arrays', snippet: 'Arrays use contiguous memory.' },
    { sourceId: 'lesson-2', title: 'Linked lists', snippet: 'Linked lists use nodes.' },
  ]

  it('does not mark an uncited answer as grounded', () => {
    const result = mapCitationsToAnswer('Arrays store same-type values.', citations)
    expect(result.groundingStatus).toBe('general')
    expect(result.citations).toEqual([])
  })

  it('keeps only valid citations used by the answer', () => {
    const result = mapCitationsToAnswer('Arrays are contiguous [1]. Invalid source [9].', citations)
    expect(result.content).toBe('Arrays are contiguous [1]. Invalid source .')
    expect(result.groundingStatus).toBe('partially_grounded')
    expect(result.citations).toEqual([citations[0]])
  })
})
