import { describe, expect, it } from 'vitest'
import { buildYouTubeGuideCandidateManifest, extractedTextForPages } from './youtube-guide-import'

describe('YouTube guide import', () => {
  it('builds draft-only candidates with page and subject provenance', () => {
    const manifest = buildYouTubeGuideCandidateManifest({
      generatedAt: '2026-06-29T00:00:00.000Z',
      sources: [
        {
          sourceId: 'cwit-youtube-sem-1-2',
          title: 'Guide',
          localPdf: 'content-import/guide.pdf',
          pages: [
            {
              page: 3,
              text: [
                'Basic Mathematics',
                'R23CP1701 / R23CI1701',
                'PRIMARY',
                'https://www.youtube.com/playlist?list=PLabc123',
              ].join('\n'),
            },
          ],
          urls: [{ page: 3, url: 'https://www.youtube.com/playlist?list=PLabc123' }],
        },
      ],
    })

    expect(manifest).toMatchObject({
      status: 'draft',
      verificationStatus: 'pending_metadata_verification',
      sourceUrlCount: 1,
      uniqueSourceUrlCount: 1,
    })
    expect(manifest.candidates).toHaveLength(1)
    expect(manifest.candidates[0]).toMatchObject({
      sourcePage: 3,
      resourceKind: 'playlist',
      role: 'primary_video',
      subjectTitle: 'Basic Mathematics',
      officialSubjectCodes: ['R23CI1701', 'R23CP1701'],
      programmeCodes: ['DCIOT', 'DCOMP'],
      publicationStatus: 'draft',
    })
  })

  it('keeps non-YouTube source links as skipped URLs', () => {
    const manifest = buildYouTubeGuideCandidateManifest({
      sources: [
        {
          sourceId: 'guide',
          title: 'Guide',
          localPdf: 'content-import/guide.pdf',
          pages: [{ page: 1, text: 'Official source' }],
          urls: [{ page: 1, url: 'https://cwit.example/source.pdf' }],
        },
      ],
    })

    expect(manifest.candidates).toHaveLength(0)
    expect(manifest.skippedUrls).toEqual([
      {
        sourceId: 'guide',
        sourcePage: 1,
        url: 'https://cwit.example/source.pdf',
        reason: 'not_youtube_resource',
      },
    ])
  })

  it('deduplicates repeated source URLs before building candidates', () => {
    const manifest = buildYouTubeGuideCandidateManifest({
      generatedAt: '2026-06-29T00:00:00.000Z',
      sources: [
        {
          sourceId: 'guide',
          title: 'Guide',
          localPdf: 'content-import/guide.pdf',
          pages: [
            { page: 1, text: 'PRIMARY\nhttps://www.youtube.com/watch?v=abc12345678' },
            { page: 2, text: 'ALTERNATE\nhttps://www.youtube.com/watch?v=abc12345678' },
          ],
          urls: [
            { page: 1, url: 'https://www.youtube.com/watch?v=abc12345678' },
            { page: 2, url: 'https://www.youtube.com/watch?v=abc12345678' },
          ],
        },
      ],
    })

    expect(manifest).toMatchObject({
      sourceUrlCount: 1,
      uniqueSourceUrlCount: 1,
    })
    expect(manifest.candidates).toHaveLength(1)
    expect(manifest.candidates[0]).toMatchObject({
      sourcePage: 1,
      role: 'primary_video',
    })
  })

  it('serializes extracted pages in the existing tmp text format', () => {
    expect(extractedTextForPages([
      { page: 2, text: 'Second' },
      { page: 1, text: 'First\n' },
    ])).toBe('--- page 1 ---\nFirst\n\n--- page 2 ---\nSecond\n')
  })
})
