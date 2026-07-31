import { describe, expect, it } from 'vitest'
import { ADAPTIVE_PATHS, buildDailyMissions, getAdaptivePath } from './catalog'

describe('student learning paths', () => {
  it('keeps every adaptive path identifier unique', () => {
    const identifiers = ADAPTIVE_PATHS.map((path) => path.id)
    expect(new Set(identifiers).size).toBe(identifiers.length)
  })

  it('returns a safe default for an unknown runtime value', () => {
    const path = getAdaptivePath('unknown-mode' as never)
    expect(path.id).toBe('complete')
  })
})

describe('daily mission builder', () => {
  it('creates a focused fast-track plan near the available time', () => {
    const missions = buildDailyMissions(45, 'fast-track')
    const totalMinutes = missions.reduce((sum, mission) => sum + mission.minutes, 0)

    expect(missions.length).toBeGreaterThan(0)
    expect(missions[0]?.id).toBe('continue-lesson')
    expect(totalMinutes).toBeLessThanOrEqual(55)
  })

  it('prioritises coding work in coding-practice mode', () => {
    const missions = buildDailyMissions(60, 'coding-practice')
    expect(missions[0]?.id).toBe('coding-rep')
  })

  it('always returns at least one useful mission for a very small target', () => {
    const missions = buildDailyMissions(1, 'complete')
    expect(missions.length).toBeGreaterThan(0)
    expect(missions[0]?.href).toBeTruthy()
  })
})
