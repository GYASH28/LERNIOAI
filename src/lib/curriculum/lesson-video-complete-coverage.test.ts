import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function load(path: string) {
  return JSON.parse(readFileSync(join(process.cwd(), ...path.split('/')), 'utf8'))
}

describe('CWIT R23 complete lesson-video research coverage', () => {
  const reconciliation = load('content/resources/lesson-video-mappings/cwit-r23-pending-video-reconciliation.json')
  const researchedGaps = load('content/resources/lesson-video-mappings/cwit-r23-researched-gap-video-mappings.json')
  const gapQueue = load('content/resources/youtube-candidates/cwit-r23-missing-lesson-video-research-queue.json')
  const reviewQueue = load('content/resources/youtube-candidates/cwit-r23-youtube-candidate-review-queue.json')

  it('has exactly one pending review candidate for every official lesson', () => {
    expect(reconciliation.summary.officialLessons).toBe(428)
    expect(reconciliation.summary.reconciledPendingCandidates).toBe(428)
    expect(gapQueue.totals.lessonsNeedingResearch).toBe(0)
    expect(reviewQueue.learningCoverage.lessonsWithoutCandidate).toBe(0)

    const lessonKeys = reconciliation.reconciled.map((candidate: Record<string, unknown>) =>
      `${candidate.officialProgrammeCode}:${candidate.subjectCode}:${candidate.officialLessonSlug}`,
    )
    expect(new Set(lessonKeys).size).toBe(428)
  })

  it('covers both programmes and every one of the six semesters', () => {
    const partitions = new Set(reconciliation.reconciled.map((candidate: Record<string, unknown>) =>
      `${candidate.officialProgrammeCode}:${candidate.officialSemesterNumber}`,
    ))
    expect([...partitions].sort()).toEqual([
      'DCIOT:1', 'DCIOT:2', 'DCIOT:3', 'DCIOT:4', 'DCIOT:5', 'DCIOT:6',
      'DCOMP:1', 'DCOMP:2', 'DCOMP:3', 'DCOMP:4', 'DCOMP:5', 'DCOMP:6',
    ])
  })

  it('keeps researched videos direct, identity-checked, and unapproved', () => {
    expect(researchedGaps.summary.researchedLessons).toBe(141)
    expect(researchedGaps.summary.unresolvedLessons).toBe(0)
    expect(researchedGaps.summary.oembedVerifiedPrimaryCandidates).toBe(141)
    expect(reviewQueue.totals.oembedFound).toBe(428)

    for (const mapping of researchedGaps.mappings) {
      expect(mapping.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(mapping.canonicalUrl).toBe(`https://www.youtube.com/watch?v=${mapping.videoId}`)
      expect(mapping.embedUrl).toBe(`https://www.youtube-nocookie.com/embed/${mapping.videoId}`)
      expect(['en', 'hi', 'hinglish']).toContain(mapping.language)
      expect(mapping.languageVerificationStatus).toBe('pending_manual_listening_confirmation')
      expect(mapping.oembedStatus).toBe('found')
      expect(mapping.reviewStatus).toBe('pending_review')
      expect(mapping.playlistId).toBeNull()
    }
    for (const item of reviewQueue.items) {
      expect(item.resourceKind).toBe('video')
      expect(item.publicationStatus).toBe('draft')
    }
  })

  it('applies the curated fixes for known weak automated matches', () => {
    const byLesson = new Map(researchedGaps.mappings.map((mapping: Record<string, unknown>) => [
      `${mapping.subjectCode}:${mapping.unitNumber}`,
      mapping.videoId,
    ]))
    expect(byLesson.get('R23CI6602:5')).toBe('oRz108pc_eE')
    expect(byLesson.get('R23CP3406:2')).toBe('_6A2ZwKAEcY')
    expect(byLesson.get('R23CP3406:3')).toBe('k0zLwDAQ6Uw')
    expect(byLesson.get('R23CP3406:6')).toBe('g4JF_Ew8qEc')
    expect(byLesson.get('R23CP4402:6')).toBe('Sl0cZpD6xKk')
  })
})
