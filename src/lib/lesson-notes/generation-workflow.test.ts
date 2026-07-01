import { describe, expect, it } from 'vitest'
import {
  generatedDocumentStatusForJobState,
  hasReviewableArtifact,
  validateGenerationJobTransition,
} from './generation-workflow'

describe('lesson note generation workflow', () => {
  it('allows a generated artifact to move from running to reviewer handoff after validation', () => {
    const decision = validateGenerationJobTransition('running', 'awaiting_review', {
      validationPassed: true,
      htmlObjectKey: 'lesson-notes/r23cp1401/intro.html',
    })

    expect(decision).toEqual({ allowed: true, errors: [] })
    expect(generatedDocumentStatusForJobState('awaiting_review')).toBe('ready_for_review')
  })

  it('blocks reviewer handoff without validation and an artifact', () => {
    const decision = validateGenerationJobTransition('running', 'awaiting_review')

    expect(decision.allowed).toBe(false)
    expect(decision.errors).toContain('Validation must pass before a generated document can await review.')
    expect(decision.errors).toContain('A generated HTML or PDF artifact is required before reviewer handoff.')
  })

  it('blocks direct completion without reviewer approval', () => {
    const decision = validateGenerationJobTransition('running', 'completed', {
      validationPassed: true,
      outputResourceApproved: true,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.errors).toContain('Cannot transition content generation job from running to completed.')
    expect(decision.errors).toContain('Reviewer approval is required before completing a generation job.')
  })

  it('allows completion from awaiting review only after approval and reviewed output', () => {
    const decision = validateGenerationJobTransition('awaiting_review', 'completed', {
      validationPassed: true,
      reviewerId: 'reviewer-1',
      outputResourceApproved: true,
    })

    expect(decision).toEqual({ allowed: true, errors: [] })
    expect(generatedDocumentStatusForJobState('completed')).toBe('approved')
  })

  it('requires failed jobs to retain an error message', () => {
    expect(validateGenerationJobTransition('running', 'failed').allowed).toBe(false)
    expect(validateGenerationJobTransition('running', 'failed', { errorMessage: 'Provider timeout' }).allowed).toBe(true)
  })

  it('detects reviewable artifacts from HTML or PDF storage keys', () => {
    expect(hasReviewableArtifact({ htmlObjectKey: 'notes.html' })).toBe(true)
    expect(hasReviewableArtifact({ storageObjectKey: 'notes.pdf' })).toBe(true)
    expect(hasReviewableArtifact({})).toBe(false)
  })
})
