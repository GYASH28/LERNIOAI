import { describe, expect, it } from 'vitest'
import { exportThemePreferences, importThemePreferences } from './theme-preferences'
import { DEFAULT_THEME_PREFS } from './theme-types'

describe('theme preference import/export', () => {
  it('exports canonical preferences without legacy aliases', () => {
    const json = exportThemePreferences({
      ...DEFAULT_THEME_PREFS,
      palette: 'forest',
      motion: 'reduced',
      theme: 'dark',
      reducedMotion: true,
    })

    const parsed = JSON.parse(json)
    expect(parsed.palette).toBe('forest')
    expect(parsed.motion).toBe('reduced')
    expect(parsed.theme).toBeUndefined()
    expect(parsed.reducedMotion).toBeUndefined()
  })

  it('rejects invalid imported values without returning partial state', () => {
    const result = importThemePreferences('{"palette":"plasma","motion":"sideways"}')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })
})
