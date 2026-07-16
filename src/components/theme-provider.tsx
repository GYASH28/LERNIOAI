'use client'

/**
 * Lernio AI 2.0 — Premium Theme Provider
 * ------------------------------------------------------------
 * Holds the user's ThemePreferences and reflects them onto the
 * <html> element via seven data-attributes plus the legacy
 * `.dark` class. Persists to BOTH localStorage (`lernio-theme-prefs`)
 * AND a cookie (`lernio-theme`) so the inline pre-hydration
 * script in layout.tsx can apply the same attributes BEFORE
 * React hydrates — eliminating the theme flash.
 *
 * Listens to two OS-level media queries:
 *  • prefers-color-scheme: dark — re-resolves `.dark` when
 *    appearance === 'system'.
 *  • prefers-reduced-motion: reduce — overrides motion to
 *    'reduced' unless the user has explicitly chosen 'none'.
 *
 * Architecture: prefs and OS reduced-motion are both modelled
 * as external stores consumed via useSyncExternalStore. This
 * avoids the React 19 `set-state-in-effect` lint rule and gives
 * us a single source of truth that the Theme Studio (Agent C)
 * can call into via the exported `setPref` action.
 *
 * Legacy v1 fields (theme, reducedMotion) are exposed on the
 * pref object as derived aliases so existing components keep
 * compiling without changes.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import {
  DEFAULT_THEME_PREFS,
  PALETTES,
  THEME_STORAGE_KEYS,
  type Appearance,
  type MotionLevel,
  type ThemePreferences,
  type ThemePrefUpdate,
} from '@/lib/theme-types'

// ---------------------------------------------------------------------------
// Migration helpers
// ---------------------------------------------------------------------------

interface LegacyPrefs {
  theme?: 'light' | 'dark' | 'system'
  reducedMotion?: boolean
  lowPower?: boolean
  mascotsEnabled?: boolean
  compactMascot?: boolean
  soundEnabled?: boolean
  hideMascotsInExams?: boolean
}

/**
 * Read a JSON pref blob from either the new cookie, the new
 * localStorage, or (for one-time migration) the legacy
 * localStorage key. Returns null when nothing usable is found.
 *
 * Order matters: cookie first so the value the pre-hydration
 * script used wins (SSR-consistent), then new localStorage,
 * then legacy localStorage for migration.
 */
function readStoredPrefs(): Partial<ThemePreferences> | null {
  if (typeof window === 'undefined') return null

  // 1. Cookie (used by the no-flash inline script too).
  try {
    const m = document.cookie.match(/(?:^|;\s*)lernio-theme=([^;]+)/)
    if (m) {
      const decoded = decodeURIComponent(m[1])
      const parsed = JSON.parse(decoded)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch { /* corrupt cookie — fall through */ }

  // 2. New localStorage key.
  try {
    const ls = window.localStorage.getItem(THEME_STORAGE_KEYS.localStorage)
    if (ls) {
      const parsed = JSON.parse(ls)
      if (parsed && typeof parsed === 'object') return parsed
    }
  } catch { /* corrupt LS — fall through */ }

  // 3. Legacy localStorage key (one-time migration).
  try {
    const legacy = window.localStorage.getItem(THEME_STORAGE_KEYS.legacy)
    if (legacy) {
      const lp = JSON.parse(legacy) as LegacyPrefs
      if (lp && typeof lp === 'object') {
        return migrateLegacyPrefs(lp)
      }
    }
  } catch { /* corrupt legacy LS — fall through */ }

  return null
}

/**
 * Map a v1 prefs blob onto the new ThemePreferences shape. Only
 * the keys present in the legacy blob are filled in — the
 * caller merges with DEFAULT_THEME_PREFS.
 */
function migrateLegacyPrefs(lp: LegacyPrefs): Partial<ThemePreferences> {
  const out: Partial<ThemePreferences> = {}
  if (lp.theme === 'light' || lp.theme === 'dark' || lp.theme === 'system') {
    out.appearance = lp.theme
  }
  if (typeof lp.reducedMotion === 'boolean') {
    out.motion = lp.reducedMotion ? 'reduced' : 'full'
  }
  if (typeof lp.lowPower === 'boolean') out.lowPower = lp.lowPower
  if (typeof lp.mascotsEnabled === 'boolean') out.mascotsEnabled = lp.mascotsEnabled
  if (typeof lp.compactMascot === 'boolean') out.compactMascot = lp.compactMascot
  if (typeof lp.soundEnabled === 'boolean') out.soundEnabled = lp.soundEnabled
  if (typeof lp.hideMascotsInExams === 'boolean') out.hideMascotsInExams = lp.hideMascotsInExams
  return out
}

/**
 * Merge a partial pref blob onto the defaults, filling in the
 * derived legacy aliases (`theme`, `reducedMotion`) last so
 * they always reflect the canonical new fields.
 */
function mergePrefs(
  partial: Partial<ThemePreferences> | null,
  osReducedMotion: boolean,
): ThemePreferences {
  const merged: ThemePreferences = { ...DEFAULT_THEME_PREFS, ...(partial ?? {}) }
  // Re-validate enum fields so a corrupt blob can't put the UI
  // into an undefined state.
  if (!isValidAppearance(merged.appearance)) merged.appearance = 'system'
  if (!isValidPalette(merged.palette)) merged.palette = 'aurora'
  if (!isValidContrast(merged.contrast)) merged.contrast = 'normal'
  if (!isValidDensity(merged.density)) merged.density = 'comfortable'
  if (!isValidSurface(merged.surfaceStyle)) merged.surfaceStyle = 'soft'
  if (!isValidSubjectTint(merged.subjectTint)) merged.subjectTint = 'subtle'
  if (!isValidMotion(merged.motion)) merged.motion = 'full'

  // Derived legacy aliases. `reducedMotion` reflects the
  // EFFECTIVE motion (post OS override).
  const effectiveMotion = effectiveMotionFor(merged.motion, osReducedMotion)
  merged.theme = merged.appearance
  merged.reducedMotion = effectiveMotion !== 'full'
  return merged
}

function effectiveMotionFor(userMotion: MotionLevel, osReducedMotion: boolean): MotionLevel {
  // OS reduced-motion overrides unless the user has explicitly
  // chosen 'none' (which is even stricter).
  if (osReducedMotion && userMotion !== 'none') return 'reduced'
  return userMotion
}

function isValidAppearance(v: unknown): v is Appearance {
  return v === 'light' || v === 'dark' || v === 'system'
}
const VALID_PALETTE_IDS = new Set<string>(PALETTES.map((palette) => palette.id))
function isValidPalette(v: unknown): boolean {
  return typeof v === 'string' && VALID_PALETTE_IDS.has(v)
}
function isValidContrast(v: unknown): boolean { return v === 'normal' || v === 'high' }
function isValidDensity(v: unknown): boolean { return v === 'comfortable' || v === 'compact' }
function isValidSurface(v: unknown): boolean { return v === 'flat' || v === 'soft' || v === 'glass' }
function isValidSubjectTint(v: unknown): boolean { return v === 'off' || v === 'subtle' || v === 'strong' }
function isValidMotion(v: unknown): boolean { return v === 'full' || v === 'reduced' || v === 'none' }

// ---------------------------------------------------------------------------
// External store: OS prefers-reduced-motion
// ---------------------------------------------------------------------------

function subscribePrefersReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', callback)
  return () => mq.removeEventListener('change', callback)
}

function getPrefersReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getPrefersReducedMotionServerSnapshot(): boolean {
  return false
}

// ---------------------------------------------------------------------------
// External store: user prefs (cookie + localStorage)
// ---------------------------------------------------------------------------

let currentPrefs: ThemePreferences = DEFAULT_THEME_PREFS
let prefsInitialized = false
const prefsListeners = new Set<() => void>()

function initPrefsOnce(): void {
  if (prefsInitialized || typeof window === 'undefined') return
  prefsInitialized = true
  const stored = readStoredPrefs()
  const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  currentPrefs = mergePrefs(stored, osReduced)
}

function getPrefsSnapshot(): ThemePreferences {
  initPrefsOnce()
  return currentPrefs
}

function getPrefsServerSnapshot(): ThemePreferences {
  return DEFAULT_THEME_PREFS
}

function subscribePrefs(callback: () => void): () => void {
  prefsListeners.add(callback)
  return () => prefsListeners.delete(callback)
}

/**
 * Update the prefs store. Accepts both canonical new fields and
 * legacy v1 fields (theme, reducedMotion) — legacy fields are
 * mapped to their canonical counterparts.
 */
function commitPrefUpdate(p: ThemePrefUpdate): void {
  const osReduced = getPrefersReducedMotionSnapshot()
  const next: ThemePreferences = { ...currentPrefs }

  // Legacy `theme` → `appearance`.
  if (p.theme !== undefined) next.appearance = p.theme
  // Legacy `reducedMotion` → `motion`.
  if (p.reducedMotion !== undefined) next.motion = p.reducedMotion ? 'reduced' : 'full'

  // Canonical new fields.
  if (p.appearance !== undefined) next.appearance = p.appearance
  if (p.palette !== undefined) next.palette = p.palette
  if (p.contrast !== undefined) next.contrast = p.contrast
  if (p.density !== undefined) next.density = p.density
  if (p.surfaceStyle !== undefined) next.surfaceStyle = p.surfaceStyle
  if (p.subjectTint !== undefined) next.subjectTint = p.subjectTint
  if (p.motion !== undefined) next.motion = p.motion
  if (p.lowPower !== undefined) next.lowPower = p.lowPower
  if (p.mascotsEnabled !== undefined) next.mascotsEnabled = p.mascotsEnabled
  if (p.compactMascot !== undefined) next.compactMascot = p.compactMascot
  if (p.soundEnabled !== undefined) next.soundEnabled = p.soundEnabled
  if (p.hideMascotsInExams !== undefined) next.hideMascotsInExams = p.hideMascotsInExams

  // Recompute derived aliases (effective motion accounts for
  // OS reduced-motion override).
  next.theme = next.appearance
  const effectiveMotion = effectiveMotionFor(next.motion, osReduced)
  next.reducedMotion = effectiveMotion !== 'full'

  currentPrefs = next
  persistPrefs(next)
  prefsListeners.forEach((l) => l())
}

/**
 * Re-derive the effective motion when the OS reduced-motion
 * setting changes. Called from the prefers-reduced-motion
 * subscription registered in the component.
 */
function refreshOsReducedMotion(): void {
  const osReduced = getPrefersReducedMotionSnapshot()
  const next: ThemePreferences = { ...currentPrefs }
  const effectiveMotion = effectiveMotionFor(next.motion, osReduced)
  const newReducedMotion = effectiveMotion !== 'full'
  if (next.reducedMotion === newReducedMotion) return // no change
  next.reducedMotion = newReducedMotion
  currentPrefs = next
  prefsListeners.forEach((l) => l())
}

// ---------------------------------------------------------------------------
// DOM application & persistence
// ---------------------------------------------------------------------------

/**
 * Resolve the effective appearance (system → light/dark via matchMedia)
 * and reflect all preferences onto <html> as data-attributes + the
 * legacy `.dark` class. Idempotent — safe to call on every pref change.
 */
function applyPrefsToDom(pref: ThemePreferences, osReducedMotion: boolean) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  const resolvedDark =
    pref.appearance === 'dark' ||
    (pref.appearance === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  root.classList.toggle('dark', resolvedDark)
  root.classList.toggle('reduce-motion', pref.reducedMotion)

  root.setAttribute('data-appearance', pref.appearance)
  root.setAttribute('data-palette', pref.palette)
  root.setAttribute('data-contrast', pref.contrast)
  root.setAttribute('data-density', pref.density)
  root.setAttribute('data-surface', pref.surfaceStyle)
  root.setAttribute('data-subject-tint', pref.subjectTint)

  const effectiveMotion = effectiveMotionFor(pref.motion, osReducedMotion)
  root.setAttribute('data-motion', effectiveMotion)

  root.setAttribute('data-low-power', String(pref.lowPower))
}

/**
 * Persist the pref blob to localStorage AND cookie. The cookie
 * is what the pre-hydration script in layout.tsx reads on the
 * next page load to apply attributes before React hydrates.
 */
function persistPrefs(pref: ThemePreferences) {
  if (typeof window === 'undefined') return

  // Strip the derived legacy aliases before persisting so the
  // stored blob is canonical (no duplicated state).
  const {
    theme: _theme,
    reducedMotion: _rm,
    ...canonical
  } = pref

  try {
    window.localStorage.setItem(THEME_STORAGE_KEYS.localStorage, JSON.stringify(canonical))
  } catch { /* storage full / disabled — non-fatal */ }

  try {
    const enc = encodeURIComponent(JSON.stringify(canonical))
    document.cookie = `${THEME_STORAGE_KEYS.cookie}=${enc}; path=/; max-age=31536000; SameSite=Lax`
  } catch { /* cookie write failed — non-fatal */ }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ThemeContextValue {
  pref: ThemePreferences
  setPref: (p: ThemePrefUpdate) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  pref: DEFAULT_THEME_PREFS,
  setPref: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Subscribe to the prefs external store (cookie + localStorage).
  const pref = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getPrefsServerSnapshot,
  )
  // Subscribe to OS prefers-reduced-motion separately so we
  // re-render when the user toggles OS reduced-motion while
  // the app is open.
  const osReducedMotion = useSyncExternalStore(
    subscribePrefersReducedMotion,
    getPrefersReducedMotionSnapshot,
    getPrefersReducedMotionServerSnapshot,
  )

  // -------- Reflect pref onto <html> + persist on every change --------
  // Side-effects only — no setState, so this is safe under the
  // react-hooks/set-state-in-effect rule.
  useEffect(() => {
    applyPrefsToDom(pref, osReducedMotion)
  }, [pref, osReducedMotion])

  // -------- Live OS colour-scheme listener --------
  // When appearance === 'system', re-resolve .dark as the OS
  // theme changes while the app is open. (Audit 4.7 fix.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      // No state change needed — applyPrefsToDom reads
      // matchMedia internally for system appearance.
      applyPrefsToDom(pref, osReducedMotion)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [pref, osReducedMotion])

  // -------- Live OS reduced-motion listener --------
  // If the user turns on OS reduced-motion while the app is
  // open, refresh the derived `reducedMotion` alias on the
  // prefs store so consumers re-render. (Audit 4.7 fix.)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => refreshOsReducedMotion()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // -------- setPref with legacy-key mapping --------
  const setPref = useCallback((p: ThemePrefUpdate) => {
    commitPrefUpdate(p)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ pref, setPref }),
    [pref, setPref],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const usePrefs = () => useContext(ThemeContext)
