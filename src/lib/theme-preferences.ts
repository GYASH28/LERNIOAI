import { z } from 'zod'
import type { ThemePreferences } from './theme-types'

const preferenceSchema = z.object({
  appearance: z.enum(['light', 'dark', 'system']).optional(),
  palette: z.enum([
    'aurora',
    'nexus',
    'paper',
    'ocean',
    'forest',
    'sakura',
    'amoled',
    'midnight',
    'sunset',
    'nord',
    'catppuccin',
    'dracula',
    'github-dark',
  ]).optional(),
  contrast: z.enum(['normal', 'high']).optional(),
  density: z.enum(['comfortable', 'compact']).optional(),
  surfaceStyle: z.enum(['flat', 'soft', 'glass']).optional(),
  subjectTint: z.enum(['off', 'subtle', 'strong']).optional(),
  motion: z.enum(['full', 'reduced', 'none']).optional(),
  lowPower: z.boolean().optional(),
  mascotsEnabled: z.boolean().optional(),
  compactMascot: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  hideMascotsInExams: z.boolean().optional(),
}).strict()

export type ThemePreferenceExport = z.infer<typeof preferenceSchema>

export type ThemePreferenceImportResult =
  | { ok: true; value: ThemePreferenceExport }
  | { ok: false; errors: string[] }

export function exportThemePreferences(pref: ThemePreferences): string {
  const {
    theme: _theme,
    reducedMotion: _reducedMotion,
    ...canonical
  } = pref

  return JSON.stringify(canonical, null, 2)
}

export function importThemePreferences(json: string): ThemePreferenceImportResult {
  try {
    const parsed = JSON.parse(json)
    const result = preferenceSchema.safeParse(parsed)
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join('.') || 'preferences'}: ${issue.message}`),
      }
    }
    return { ok: true, value: result.data }
  } catch {
    return { ok: false, errors: ['Invalid JSON.'] }
  }
}
