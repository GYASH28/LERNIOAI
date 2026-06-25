import { describe, expect, it } from 'vitest'
import { polishTutorContent } from './groq-provider'

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
