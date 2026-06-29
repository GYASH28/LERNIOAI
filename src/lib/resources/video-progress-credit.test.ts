import { describe, expect, it } from 'vitest'
import { calculateVideoCredit } from './video-progress-credit'

const base = new Date('2026-06-29T10:00:00.000Z')

describe('calculateVideoCredit', () => {
  it('does not credit a first heartbeat without prior server state', () => {
    const result = calculateVideoCredit({
      previousLastSecond: 0,
      previousWatchedSeconds: 0,
      previousCompletedAt: null,
      previousUpdatedAt: null,
      currentSecond: 180,
      durationSeconds: 200,
      now: base,
    })

    expect(result.watchedSeconds).toBe(0)
    expect(result.watchPercent).toBe(0)
    expect(result.completedAt).toBeNull()
    expect(result.creditRejectedReason).toBe('no_prior_state')
  })

  it('credits ordinary forward playback capped by elapsed wall time plus tolerance', () => {
    const result = calculateVideoCredit({
      previousLastSecond: 10,
      previousWatchedSeconds: 10,
      previousCompletedAt: null,
      previousUpdatedAt: base,
      currentSecond: 26,
      durationSeconds: 100,
      now: new Date(base.getTime() + 12_000),
    })

    expect(result.creditedDeltaSeconds).toBe(16)
    expect(result.watchedSeconds).toBe(26)
    expect(result.watchPercent).toBe(26)
  })

  it('does not credit large seek jumps as watched time', () => {
    const result = calculateVideoCredit({
      previousLastSecond: 10,
      previousWatchedSeconds: 10,
      previousCompletedAt: null,
      previousUpdatedAt: base,
      currentSecond: 180,
      durationSeconds: 200,
      now: new Date(base.getTime() + 2_000),
    })

    expect(result.lastSecond).toBe(180)
    expect(result.watchedSeconds).toBe(10)
    expect(result.completedAt).toBeNull()
    expect(result.creditRejectedReason).toBe('seek_jump')
  })

  it('derives completion only from credited watched seconds', () => {
    const result = calculateVideoCredit({
      previousLastSecond: 90,
      previousWatchedSeconds: 90,
      previousCompletedAt: null,
      previousUpdatedAt: base,
      currentSecond: 96,
      durationSeconds: 100,
      now: new Date(base.getTime() + 6_000),
    })

    expect(result.watchPercent).toBe(96)
    expect(result.completedAt).toEqual(new Date(base.getTime() + 6_000))
  })
})
