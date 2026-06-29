import { describe, expect, it } from 'vitest'
import {
  canonicalizeYouTubeUrl,
  isLessonResourceRole,
  normalizeLessonResourceRole,
} from './lesson-resource-policy'

describe('lesson resource roles', () => {
  it('accepts only governed lesson resource roles', () => {
    expect(isLessonResourceRole('primary_video')).toBe(true)
    expect(isLessonResourceRole('lesson_notes')).toBe(true)
    expect(isLessonResourceRole('random_dump')).toBe(false)
  })

  it('normalizes role input without inventing roles', () => {
    expect(normalizeLessonResourceRole(' Primary_Video ')).toBe('primary_video')
    expect(normalizeLessonResourceRole('primary-video')).toBeNull()
  })
})

describe('canonicalizeYouTubeUrl', () => {
  it('canonicalizes playlist URLs from the CWIT guide PDFs', () => {
    expect(
      canonicalizeYouTubeUrl('https://www.youtube.com/playlist?list=PL5ZIcm-hgbJM1xRu_2OUf0qRXBNf9Z3n-'),
    ).toEqual({
      kind: 'playlist',
      canonicalUrl: 'https://www.youtube.com/playlist?list=PL5ZIcm-hgbJM1xRu_2OUf0qRXBNf9Z3n-',
      externalId: 'PL5ZIcm-hgbJM1xRu_2OUf0qRXBNf9Z3n-',
      videoId: null,
      playlistId: 'PL5ZIcm-hgbJM1xRu_2OUf0qRXBNf9Z3n-',
    })
  })

  it('canonicalizes watch URLs and preserves playlist context when present', () => {
    expect(
      canonicalizeYouTubeUrl('https://www.youtube.com/watch?v=Kmgo00avvEw&list=PLabc123'),
    ).toEqual({
      kind: 'video',
      canonicalUrl: 'https://www.youtube.com/watch?v=Kmgo00avvEw&list=PLabc123',
      externalId: 'Kmgo00avvEw',
      videoId: 'Kmgo00avvEw',
      playlistId: 'PLabc123',
    })
  })

  it('canonicalizes shortened and embed video URLs', () => {
    expect(canonicalizeYouTubeUrl('https://youtu.be/yK1uBHPdp30')?.canonicalUrl).toBe(
      'https://www.youtube.com/watch?v=yK1uBHPdp30',
    )
    expect(canonicalizeYouTubeUrl('https://www.youtube.com/embed/0tM-l_ZsxjU')?.canonicalUrl).toBe(
      'https://www.youtube.com/watch?v=0tM-l_ZsxjU',
    )
  })

  it('rejects non-YouTube and malformed URLs', () => {
    expect(canonicalizeYouTubeUrl('https://example.com/watch?v=Kmgo00avvEw')).toBeNull()
    expect(canonicalizeYouTubeUrl('not a url')).toBeNull()
  })
})

