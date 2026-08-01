import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

interface ResearchQueue {
  mappings: Array<{
    subjectCode: string
    lessonSlug: string
    videoId: string
    language: string
    reviewStatus: string
  }>
}

function loadQueue() {
  return JSON.parse(readFileSync(join(
    process.cwd(),
    'content',
    'resources',
    'lesson-video-mappings',
    'cwit-r23-direct-video-mappings.json',
  ), 'utf8')) as ResearchQueue
}

describe('CWIT direct-video research queue', () => {
  it('contains only direct pending-review English or Hindi candidates', () => {
    const queue = loadQueue()

    expect(queue.mappings.length).toBeGreaterThanOrEqual(250)
    for (const mapping of queue.mappings) {
      expect(mapping.videoId).toMatch(/^[A-Za-z0-9_-]{11}$/)
      expect(['en', 'hi']).toContain(mapping.language)
      expect(mapping.reviewStatus).toBe('pending_review')
    }
  })

  it('does not duplicate a lesson or reuse a video inside one subject', () => {
    const queue = loadQueue()
    const lessonKeys = new Set<string>()
    const subjectVideoKeys = new Set<string>()

    for (const mapping of queue.mappings) {
      const lessonKey = `${mapping.subjectCode}:${mapping.lessonSlug}`
      const videoKey = `${mapping.subjectCode}:${mapping.videoId}`
      expect(lessonKeys.has(lessonKey)).toBe(false)
      expect(subjectVideoKeys.has(videoKey)).toBe(false)
      lessonKeys.add(lessonKey)
      subjectVideoKeys.add(videoKey)
    }
  })
})
