import { describe, expect, it } from 'vitest'
import {
  getManifestSemester,
  getManifestSubjectsForSemester,
} from './manifest-data'

describe('manifest curriculum fallback', () => {
  it('ignores derived curriculum JSON artifacts that are not semester manifests', () => {
    expect(() => getManifestSemester('DCOMP', 3)).not.toThrow()
    expect(getManifestSemester('DCOMP', 3)?.number).toBe(3)
  })

  it('returns usable subjects after the official course-content artifact is added', () => {
    const subjects = getManifestSubjectsForSemester('DCIOT', 4)
    expect(subjects.length).toBeGreaterThan(0)
    expect(subjects.every((subject) => Boolean(subject.code && subject.name))).toBe(true)
  })
})
