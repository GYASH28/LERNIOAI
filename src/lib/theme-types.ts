/**
 * Lernio AI 2.0 — Theme preference types & palette metadata
 * ------------------------------------------------------------
 * The single source of truth for the new premium theme engine.
 *
 * The ThemeProvider (src/components/theme-provider.tsx) holds an
 * instance of `ThemePreferences`, applies seven data-attributes
 * to <html> (data-appearance, data-palette, data-contrast,
 * data-density, data-surface, data-subject-tint, data-motion)
 * plus data-low-power, and toggles the `.dark` class based on
 * the resolved appearance.
 *
 * The Theme Studio (Agent C — src/components/views/profile.tsx)
 * consumes `PALETTES` to render the swatch grid and `setPref`
 * from `usePrefs()` to mutate user preferences.
 *
 * Legacy consumers (mascot, learn, practice, exam, profile v1,
 * sidebar, focus-timer, flashcard-player, study-calendar-heatmap,
 * exam-readiness-widget, subject-readiness-radar, streak-freeze,
 * mascot-toast) continue to read `pref.theme`, `pref.reducedMotion`,
 * `pref.lowPower`, `pref.mascotsEnabled`, `pref.compactMascot`,
 * `pref.soundEnabled`, `pref.hideMascotsInExams` — these fields
 * are exposed on the pref object as derived/legacy aliases.
 */

export type Appearance = 'light' | 'dark' | 'system'
export type Palette = 'aurora' | 'nexus' | 'paper' | 'ocean' | 'forest' | 'sakura'
export type Contrast = 'normal' | 'high'
export type Density = 'comfortable' | 'compact'
export type SurfaceStyle = 'flat' | 'soft' | 'glass'
export type SubjectTint = 'off' | 'subtle' | 'strong'
export type MotionLevel = 'full' | 'reduced' | 'none'

export interface ThemePreferences {
  /** Light / dark / follow-OS. */
  appearance: Appearance
  /** One of the 6 palette families. */
  palette: Palette
  /** Normal or high-contrast override (works across ALL palettes). */
  contrast: Contrast
  /** Comfortable (default) or compact spacing. */
  density: Density
  /** Flat / soft / glass surface treatment. */
  surfaceStyle: SurfaceStyle
  /** Off / subtle / strong subject colour tinting on cards. */
  subjectTint: SubjectTint
  /** Full / reduced / none motion level. */
  motion: MotionLevel
  /** Low-power mode disables blur, parallax, and other GPU-heavy effects. */
  lowPower: boolean

  // ---------- Mascot / sound preferences (preserved from v1) ----------
  mascotsEnabled: boolean
  compactMascot: boolean
  soundEnabled: boolean
  /** When true, mascots are hidden inside the Exams view (mock exam shell, etc.). */
  hideMascotsInExams: boolean

  // ---------- Legacy derived aliases (for backward compatibility) ----------
  /** Alias for `appearance`. Some v1 components read `pref.theme`. */
  theme: Appearance
  /** Derived from `motion !== 'full'`. v1 components read this. */
  reducedMotion: boolean
}

export const DEFAULT_THEME_PREFS: ThemePreferences = {
  appearance: 'system',
  palette: 'aurora',
  contrast: 'normal',
  density: 'comfortable',
  surfaceStyle: 'soft',
  subjectTint: 'subtle',
  motion: 'full',
  lowPower: false,
  mascotsEnabled: true,
  compactMascot: false,
  soundEnabled: false,
  hideMascotsInExams: true,
  // Derived aliases — kept in sync by the ThemeProvider.
  theme: 'system',
  reducedMotion: false,
}

/**
 * Palette metadata for the Theme Studio UI. The `swatches` object
 * carries one representative OKLCH colour per surface, used by
 * Agent C to render live previews without having to switch the
 * active palette.
 */
export interface PaletteMeta {
  id: Palette
  name: string
  description: string
  swatches: {
    canvas: string
    surface: string
    brand: string
    accent: string
  }
  /** Marks palettes that are designed dark-first. */
  darkFirst?: boolean
}

export const PALETTES: readonly PaletteMeta[] = [
  {
    id: 'aurora',
    name: 'Aurora Scholar',
    description: 'Intelligent, optimistic, modern violet identity',
    swatches: {
      canvas: 'oklch(0.985 0.006 285)',
      surface: 'oklch(1 0 0)',
      brand: 'oklch(0.53 0.22 292)',
      accent: 'oklch(0.62 0.15 225)',
    },
  },
  {
    id: 'nexus',
    name: 'Midnight Nexus',
    description: 'Serious, technical, cinematic for night study',
    darkFirst: true,
    swatches: {
      canvas: 'oklch(0.125 0.018 270)',
      surface: 'oklch(0.205 0.026 276)',
      brand: 'oklch(0.70 0.19 292)',
      accent: 'oklch(0.72 0.13 210)',
    },
  },
  {
    id: 'paper',
    name: 'Paper Focus',
    description: 'Warm, book-like, quiet for long reading',
    swatches: {
      canvas: 'oklch(0.975 0.018 86)',
      surface: 'oklch(0.992 0.010 90)',
      brand: 'oklch(0.48 0.13 42)',
      accent: 'oklch(0.50 0.10 150)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean Circuit',
    description: 'Precise, fresh, technical cobalt-teal',
    swatches: {
      canvas: 'oklch(0.975 0.014 220)',
      surface: 'oklch(0.995 0.006 220)',
      brand: 'oklch(0.52 0.16 235)',
      accent: 'oklch(0.62 0.14 190)',
    },
  },
  {
    id: 'forest',
    name: 'Forest Academy',
    description: 'Grounded, stable, restful sage-green',
    swatches: {
      canvas: 'oklch(0.975 0.015 145)',
      surface: 'oklch(0.995 0.005 145)',
      brand: 'oklch(0.45 0.13 150)',
      accent: 'oklch(0.57 0.12 105)',
    },
  },
  {
    id: 'sakura',
    name: 'Sakura Calm',
    description: 'Soft, calm, elegant plum-rose',
    swatches: {
      canvas: 'oklch(0.985 0.012 350)',
      surface: 'oklch(0.998 0.004 350)',
      brand: 'oklch(0.55 0.18 340)',
      accent: 'oklch(0.60 0.12 290)',
    },
  },
] as const

/**
 * Storage keys. The new format lives under `lernio-theme-prefs`
 * (localStorage) and `lernio-theme` (cookie). The legacy
 * `lernio-prefs` localStorage key is read once for migration
 * but never written by the new provider.
 */
export const THEME_STORAGE_KEYS = {
  legacy: 'lernio-prefs',
  localStorage: 'lernio-theme-prefs',
  cookie: 'lernio-theme',
} as const

/**
 * Partial update type accepted by `setPref`. Accepts both new
 * fields and legacy fields (theme, reducedMotion) — legacy
 * fields are mapped to their canonical counterparts inside the
 * ThemeProvider so existing v1 components (e.g. the current
 * profile.tsx) keep compiling.
 */
export type ThemePrefUpdate = Partial<Omit<ThemePreferences, 'theme' | 'reducedMotion'>> & {
  /** Legacy alias for `appearance`. */
  theme?: Appearance
  /** Legacy alias mapped to `motion: 'reduced'` when true. */
  reducedMotion?: boolean
}
