import 'server-only'

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'

const MappingSchema = z.object({
  subjectCode: z.string().min(1),
  lessonSlug: z.string().min(1),
  videoId: z.string().regex(/^[\w-]{11}$/),
  title: z.string().min(1),
  channel: z.string().default('YouTube'),
  language: z.string().default('en'),
  description: z.string().default(''),
  playlistId: z.string().nullable().optional(),
  playlistIndex: z.number().int().nonnegative().nullable().optional(),
  confidence: z.number().min(0).max(1),
  reviewStatus: z.enum(['approved', 'approved_auto', 'pending_review', 'rejected']),
  sourcePdf: z.string().default('CWIT YouTube Lecture Guide'),
  sourcePage: z.number().int().nonnegative().default(0),
})

const CatalogSchema = z.object({
  version: z.number().int().positive(),
  generatedAt: z.string(),
  mappings: z.array(MappingSchema),
})

export type ReviewedLessonVideoMapping = z.infer<typeof MappingSchema>

const CATALOG_PATH = join(
  process.cwd(),
  'content',
  'resources',
  'lesson-video-mappings',
  'cwit-r23-direct-video-mappings.json',
)

let cached: ReviewedLessonVideoMapping[] | null = null

export function getReviewedLessonVideoMappings(subjectCodes: string[]): ReviewedLessonVideoMapping[] {
  const codeSet = new Set(subjectCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))
  return loadCatalog().filter((mapping) =>
    codeSet.has(mapping.subjectCode.trim().toUpperCase()) &&
    mapping.reviewStatus === 'approved',
  )
}

function loadCatalog(): ReviewedLessonVideoMapping[] {
  if (cached) return cached
  if (!existsSync(CATALOG_PATH)) {
    cached = []
    return cached
  }

  try {
    const parsed = CatalogSchema.parse(JSON.parse(readFileSync(CATALOG_PATH, 'utf-8')))
    cached = parsed.mappings
  } catch (error) {
    console.warn('[lesson-video-catalog] Ignoring invalid mapping catalog.', error)
    cached = []
  }
  return cached
}
