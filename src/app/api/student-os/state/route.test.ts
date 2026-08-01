import { describe, expect, it, vi } from 'vitest'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

vi.mock('@/lib/db', () => ({ db: {} }))

import {
  assertStudentStatePayloadSize,
  mergeStateValue,
  parseEnvelope,
} from '@/lib/student-os/state-sync'

describe('normalized Student OS state', () => {
  it('merges notebook records independently using each record update time', () => {
    const merged = mergeStateValue(
      STUDENT_OS_STORAGE.notebook,
      [
        { id: 'one', title: 'old', updatedAt: '2026-01-01T00:00:00.000Z' },
        { id: 'remote-only', updatedAt: '2026-02-01T00:00:00.000Z' },
      ],
      [
        { id: 'one', title: 'new', updatedAt: '2026-03-01T00:00:00.000Z' },
        { id: 'local-only', updatedAt: '2026-02-15T00:00:00.000Z' },
      ],
    ) as Array<{ id: string; title?: string }>

    expect(merged.find((entry) => entry.id === 'one')?.title).toBe('new')
    expect(merged.map((entry) => entry.id)).toEqual(['one', 'local-only', 'remote-only'])
  })

  it('unions same-day mission completions instead of losing another device update', () => {
    expect(mergeStateValue(
      STUDENT_OS_STORAGE.missions,
      { date: '2026-08-01', completed: ['learn'] },
      { date: '2026-08-01', completed: ['practice'] },
    )).toEqual({ date: '2026-08-01', completed: ['learn', 'practice'] })
  })

  it('allows a notebook beyond the old 256 KB bookmark ceiling', () => {
    const serialized = JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), value: 'x'.repeat(300_000) })
    expect(() => assertStudentStatePayloadSize(STUDENT_OS_STORAGE.notebook, serialized)).not.toThrow()
    expect(() => assertStudentStatePayloadSize(STUDENT_OS_STORAGE.profile, serialized)).toThrow('too large')
  })

  it('rejects corrupted legacy envelopes instead of overwriting the local copy', () => {
    expect(() => parseEnvelope('{"version":2}')).toThrow('could not be read')
  })
})
