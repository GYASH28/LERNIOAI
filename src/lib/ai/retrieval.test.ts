import { describe, expect, it, vi } from 'vitest'
import {
  chunksToCitations,
  chunksToContextBlock,
  lessonRecordToRetrievedChunks,
  type RetrievedChunk,
} from './retrieval'

vi.mock('server-only', () => ({}))

describe('LEO retrieval context', () => {
  it('adds approved resource chapters and generated document artifacts to lesson chunks', () => {
    const chunks = lessonRecordToRetrievedChunks({
      id: 'lesson_1',
      title: 'Pointers in C++',
      learnContent: JSON.stringify({
        definition: 'A pointer stores the memory address of another variable.',
      }),
      unit: {
        title: 'Pointers',
        subject: { name: 'Object Oriented Programming with C++' },
      },
      resources: [
        {
          id: 'lesson_resource_1',
          role: 'primary_video',
          coveragePercentage: 80,
          resource: {
            id: 'resource_1',
            title: 'Pointers lecture',
            type: 'video_link',
            provider: 'youtube',
            creator: 'CWIT Faculty',
            durationSeconds: 600,
            videoChapters: [
              {
                id: 'chapter_1',
                title: 'Address operator',
                startSeconds: 75,
                transcriptSnippet: 'The address-of operator returns the memory location of a variable.',
              },
            ],
          },
        },
      ],
      generatedDocuments: [
        {
          id: 'document_1',
          documentType: 'lesson_notes',
          version: 2,
          pageCount: 4,
          htmlObjectKey: 'lesson-notes/pointers.html',
          outputResource: {
            id: 'resource_2',
            title: 'Pointers quick notes',
            type: 'pdf',
          },
        },
      ],
    })

    expect(chunks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceId: 'lesson_1',
        location: 'learn > definition',
      }),
      expect.objectContaining({
        sourceId: 'resource:resource_1',
        location: 'resource > chapter: Address operator',
        snippet: expect.stringContaining('1:15 Address operator'),
      }),
      expect.objectContaining({
        sourceId: 'generated-document:document_1',
        title: 'Pointers quick notes',
        location: 'generated document > lesson_notes',
      }),
    ]))
  })

  it('keeps prompt context numbers aligned with deduped citations', () => {
    const chunks: RetrievedChunk[] = [
      {
        sourceId: 'lesson_1',
        title: 'Lesson One',
        subject: 'Programming',
        unit: 'Pointers',
        location: 'learn > definition',
        snippet: 'First lesson fact.',
      },
      {
        sourceId: 'lesson_1',
        title: 'Lesson One',
        subject: 'Programming',
        unit: 'Pointers',
        location: 'revise > shortNotes',
        snippet: 'Second lesson fact.',
      },
      {
        sourceId: 'resource:resource_1',
        title: 'Pointer video',
        subject: 'Programming',
        unit: 'Pointers',
        location: 'resource > primary_video',
        snippet: 'Approved pointer video.',
      },
    ]

    const context = chunksToContextBlock(chunks)
    const citations = chunksToCitations(chunks)

    expect(citations).toHaveLength(2)
    expect(context).toContain('[1] Lesson One')
    expect(context).toContain('First lesson fact.')
    expect(context).toContain('Second lesson fact.')
    expect(context).toContain('[2] Pointer video')
    expect(context).not.toContain('[3]')
  })
})
