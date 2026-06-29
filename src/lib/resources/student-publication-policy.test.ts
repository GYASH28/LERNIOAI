import { describe, expect, it } from 'vitest'
import {
  isStudentVisibleGeneratedDocument,
  isStudentVisibleLessonResource,
  isStudentVisibleQuestion,
  isStudentVisibleResource,
  isStudentVisibleSubject,
} from './student-publication-policy'

describe('student publication policy', () => {
  it('allows only verified clear public or published resources', () => {
    expect(isStudentVisibleResource(resource())).toBe(true)
    expect(isStudentVisibleResource(resource({ visibility: 'private' }))).toBe(false)
    expect(isStudentVisibleResource(resource({ verified: false }))).toBe(false)
    expect(isStudentVisibleResource(resource({ moderationStatus: 'held' }))).toBe(false)
    expect(isStudentVisibleResource(resource({ archivedAt: '2026-06-28T00:00:00.000Z' }))).toBe(false)
  })

  it('hides lesson resources until both mapping and resource are approved for students', () => {
    expect(isStudentVisibleLessonResource(lessonResource())).toBe(true)
    expect(isStudentVisibleLessonResource(lessonResource({ status: 'draft' }))).toBe(false)
    expect(isStudentVisibleLessonResource(lessonResource({ verificationStatus: 'pending' }))).toBe(false)
    expect(isStudentVisibleLessonResource(lessonResource({ resource: resource({ verified: false }) }))).toBe(false)
  })

  it('hides active subjects until official review status is publishable', () => {
    expect(isStudentVisibleSubject(subject())).toBe(true)
    expect(isStudentVisibleSubject(subject({ reviewStatus: 'draft' }))).toBe(false)
    expect(isStudentVisibleSubject(subject({ status: 'draft' }))).toBe(false)
    expect(isStudentVisibleSubject(subject({ archivedAt: '2026-06-29T00:00:00.000Z' }))).toBe(false)
  })

  it('hides questions until both publication and review state are approved', () => {
    expect(isStudentVisibleQuestion(question())).toBe(true)
    expect(isStudentVisibleQuestion(question({ status: 'draft' }))).toBe(false)
    expect(isStudentVisibleQuestion(question({ reviewStatus: 'unreviewed' }))).toBe(false)
    expect(isStudentVisibleQuestion(question({ archivedAt: '2026-06-29T00:00:00.000Z' }))).toBe(false)
  })

  it('hides generated documents without approved status or usable output', () => {
    expect(isStudentVisibleGeneratedDocument(generatedDocument())).toBe(true)
    expect(isStudentVisibleGeneratedDocument(generatedDocument({ generationStatus: 'ready_for_review' }))).toBe(false)
    expect(isStudentVisibleGeneratedDocument(generatedDocument({ outputResourceId: null, outputResource: null }))).toBe(false)
    expect(isStudentVisibleGeneratedDocument(generatedDocument({
      outputResourceId: null,
      outputResource: null,
      htmlObjectKey: 'lesson-notes/r23cp1401/intro.html',
    }))).toBe(true)
    expect(isStudentVisibleGeneratedDocument(generatedDocument({
      outputResource: resource({ moderationStatus: 'held' }),
    }))).toBe(false)
  })
})

function resource(overrides: Partial<{
  visibility: string | null
  verified: boolean
  moderationStatus: string | null
  archivedAt: Date | string | null
}> = {}) {
  return {
    visibility: 'published',
    verified: true,
    moderationStatus: 'clear',
    archivedAt: null,
    ...overrides,
  }
}

function lessonResource(overrides: Partial<{
  status: string | null
  verificationStatus: string | null
  resource: ReturnType<typeof resource>
}> = {}) {
  return {
    status: 'published',
    verificationStatus: 'approved',
    resource: resource(),
    ...overrides,
  }
}

function subject(overrides: Partial<{
  status: string | null
  reviewStatus: string | null
  archivedAt: Date | string | null
}> = {}) {
  return {
    status: 'active',
    reviewStatus: 'structure_verified',
    archivedAt: null,
    ...overrides,
  }
}

function question(overrides: Partial<{
  status: string | null
  reviewStatus: string | null
  archivedAt: Date | string | null
}> = {}) {
  return {
    status: 'published',
    reviewStatus: 'approved',
    archivedAt: null,
    ...overrides,
  }
}

function generatedDocument(overrides: Partial<{
  generationStatus: string | null
  outputResourceId: string | null
  storageObjectKey: string | null
  htmlObjectKey: string | null
  outputResource: ReturnType<typeof resource> | null
}> = {}) {
  return {
    generationStatus: 'approved',
    outputResourceId: 'resource-1',
    storageObjectKey: null,
    htmlObjectKey: null,
    outputResource: resource(),
    ...overrides,
  }
}
