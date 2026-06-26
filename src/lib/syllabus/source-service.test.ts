import { describe, expect, it } from 'vitest'
import { CreateSyllabusSourceSchema, QueueImportSchema } from './source-service'

const baseSource = {
  institutionId: 'inst_1',
  title: 'CWIT Computer Engineering R23 syllabus',
  sourceType: 'official_pdf' as const,
}

describe('CreateSyllabusSourceSchema', () => {
  it('accepts official public CWIT source URLs', () => {
    const result = CreateSyllabusSourceSchema.safeParse({
      ...baseSource,
      sourceUrl: 'https://cwit.mespune.org/wp-content/uploads/2022/04/COMPUTER-MPECS-18-CURRICULUM.pdf',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.trustLevel).toBe('official')
    }
  })

  it('rejects localhost and private network URLs for import safety', () => {
    const unsafeUrls = [
      'http://localhost:3000/admin',
      'http://127.0.0.1:5432/',
      'http://10.0.0.7/internal.pdf',
      'http://172.16.1.2/internal.pdf',
      'http://192.168.1.8/internal.pdf',
    ]

    for (const sourceUrl of unsafeUrls) {
      expect(CreateSyllabusSourceSchema.safeParse({ ...baseSource, sourceUrl }).success).toBe(false)
    }
  })

  it('requires either a source URL or uploaded object key', () => {
    expect(CreateSyllabusSourceSchema.safeParse(baseSource).success).toBe(false)
    expect(CreateSyllabusSourceSchema.safeParse({ ...baseSource, objectKey: 'uploads/source.pdf' }).success).toBe(true)
  })
})

describe('QueueImportSchema', () => {
  it('defaults queued imports to the manual review parser', () => {
    const result = QueueImportSchema.parse({ syllabusDocumentId: 'source_1' })

    expect(result.parserVersion).toBe('manual-review-v1')
  })
})
