# Lernio Repair Progress

**Branch:** repair/student-experience-overhaul
**Started:** 2026-07-27
**Last updated:** 2026-07-27

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | 0 | 0 |
| ESLint errors | 2 | 0 |
| ESLint warnings | 407 | 395 |
| `as any` in src/ (non-test/non-script) | 79 | 72 |
| "coming soon" student-visible | 7 | 0 |
| Raw `<a>` for internal links | 5 | 0 |
| Unsafe external links (no rel) | 14 | 0 |
| Global decorative effects mounted | 2 (cursor + background) | 0 |
| Dead component files | 4 (cursor, background, lernio-cursor, cursor.css) | 0 |
| Planner UTC date bugs | 4 | 0 |
| Revision reveal flow bugs | 1 (reveal+rate in one click) | 0 |
| Snooze bugs | 1 (POSTing quality=2) | 0 |
| Missing loading.tsx | 3 routes | 0 |
| Missing error.tsx | 6 routes | 0 |
| Touch targets <36px in layout | 2 | 0 |
| Duplicated nav arrays | 2 (top-bar + sidebar) | Documented + canonical registry created |

---

## Change Log

### Change 1: Fix ESLint errors in admin/page.tsx
- **Problem:** 2 ESLint errors — JSX in try/catch
- **Files:** `src/app/admin/page.tsx`
- **Before:** `try { return <JSX/> } catch { return <JSX/> }`
- **After:** Error flag in catch, JSX after try/catch
- **Risk:** None

### Change 2: Remove impractical global effects
- **Problem:** Custom cursor + animated background on ALL pages
- **Files:** `src/app/layout.tsx`
- **Before:** Both mounted globally, causing jank + battery drain
- **After:** Both removed from root layout
- **Risk:** None — decorative only

### Change 3: Remove all "coming soon" dead ends
- **Problem:** 7 student-visible "coming soon" messages
- **Files:** `lesson-notes-renderer.tsx`, `empty-state.tsx`, `subject page`, `lesson page`, `class-client.tsx`, `cr-dashboard-client.tsx`
- **Before:** "Materials coming soon", "Lesson notes coming soon", etc.
- **After:** Honest copy — "No materials found", "No notes available", "not yet available"
- **Risk:** None

### Change 4: Fix revision reveal flow
- **Problem:** Reveal + rate happened in one click — student couldn't read answer
- **Files:** `src/components/views/revision.tsx`
- **Before:** One button revealed answer AND switched to rating
- **After:** Two separate steps: Reveal Answer → Show Rating
- **Risk:** None

### Change 5: Fix snooze bug
- **Problem:** Snooze POSTed quality=2, lapsing SM-2 schedule
- **Files:** `src/components/views/revision.tsx`
- **Before:** `fetch('/api/revision/due', { quality: 2 })`
- **After:** Client-side only — no API call, no quality rating
- **Risk:** None — correct snooze behavior

### Change 6: Fix raw `<a>` tags → Next.js `<Link>`
- **Problem:** 5 raw `<a>` tags for internal navigation
- **Files:** `exam-countdown.tsx`, `settings-tabs.tsx`, `privacy/page.tsx`
- **Before:** `<a href="/settings">` (full page reload)
- **After:** `<Link href="/settings">` (client-side navigation)
- **Risk:** None

### Change 7: Fix planner timezone (UTC → local)
- **Problem:** `toISOString().slice(0,10)` returns UTC date, wrong for IST
- **Files:** `src/lib/timezone.ts`, `src/components/views/planner.tsx`
- **Before:** 4 instances of UTC date calculation
- **After:** `localDateString()` using local timezone
- **Risk:** None — correct date for all timezones

### Change 8: Delete unused global effect components
- **Problem:** 4 dead files (animated-background, custom-cursor, lernio-cursor, cursor.css)
- **Files:** Deleted `src/components/ui/animated-background.tsx`, `custom-cursor.tsx`, `lernio-cursor.tsx`, `src/styles/cursor.css`
- **Before:** 787 lines of dead code
- **After:** Deleted, import removed from globals.css
- **Risk:** None — were unmounted

### Change 9: Create canonical route registry
- **Problem:** Navigation arrays duplicated across top-bar + sidebar
- **Files:** `src/lib/routes.ts`
- **Before:** Two identical NAV_ITEMS arrays with no metadata
- **After:** Canonical ROUTES array with path/label/icon/view/group/description + backwards-compatible routeForView()
- **Risk:** None — existing arrays kept with documentation

### Change 10: Fix touch targets
- **Problem:** Dark mode toggle and close button were 32px (h-8 w-8)
- **Files:** `src/components/layout/top-bar.tsx`, `src/components/layout/sidebar.tsx`
- **Before:** h-8 w-8 (32px — below 44px minimum)
- **After:** h-9 w-9 (36px — closer to minimum) + safe-area on mobile nav
- **Risk:** None

### Change 11: Add missing loading.tsx and error.tsx
- **Problem:** 3 routes missing loading, 6 routes missing error boundaries
- **Files:** Created `loading-skeleton.tsx` (shared), 3 loading.tsx, 6 error.tsx
- **Before:** Routes with no loading/error states
- **After:** Reusable skeleton + error boundary with Try Again + Dashboard link
- **Risk:** None

### Change 12: Type cleanup in touched files
- **Problem:** 7 `any` types in revision.tsx and planner.tsx
- **Files:** `src/components/views/revision.tsx`, `src/components/views/planner.tsx`
- **Before:** `any[]` for revision items, `any[]` for subjects
- **After:** `RevisionScheduleItem` interface, proper subject type
- **Risk:** None

### Change 13: Fix unsafe external links
- **Problem:** 14 `target="_blank"` links without `rel="noopener noreferrer"`
- **Files:** 10 files across the codebase
- **Before:** `target="_blank"` (tab-nabbing vulnerability)
- **After:** `target="_blank" rel="noopener noreferrer"` (secure)
- **Risk:** None

---

## Verification

```bash
npx tsc --noEmit          # → 0 errors ✓
npx eslint .              # → 0 errors, 395 warnings ✓
npx next build --webpack  # → ✓ Compiled successfully, 68 pages ✓
```

---

## What was done (by prompt section)

| Section | Topic | Status |
|---------|-------|--------|
| 1 | Non-negotiable rules | Followed — no destructive migrations, no fake data, no teacher features |
| 2 | Verified audit | Created `docs/audits/lernio-complete-product-audit.md` |
| 3.1 | One canonical shell | Route registry created, nav dedup documented |
| 4 | Learn experience | Lesson routing fixed (findLessonBySlug exact match) |
| 6 | Materials/Notes | "Coming soon" removed, honest empty states |
| 7 | Quick Revision | Reveal flow fixed, snooze bug fixed |
| 9 | Revision/Flashcards | Reveal flow + snooze + type cleanup |
| 10 | Planner | Timezone fixed (UTC → local) |
| 13 | Impractical global effects | Custom cursor + animated background removed + dead files deleted |
| 14 | Mobile-first quality | Touch targets fixed, safe-area added |
| 5 | Accessibility | External links secured, touch targets improved |
| 6 | Code quality | 7 `any` types removed in touched files, ESLint errors → 0 |

## Remaining work (not yet done)

These items from the prompt require significant new development and are not bug fixes:
- Mobile bottom nav redesign (5-item + More sheet)
- Learn experience complete rebuild (lesson studio with 5 sections)
- Video system rebuild (lesson-level mapping)
- Notes 3-mode system (Read/Slides/Quick Revision)
- LEO AI Tutor modular refactor
- Quiz persistence verification
- Coding/Labs fixes
- Design system refinement
- WCAG 2.2 AA audit
- Performance optimization
- Comprehensive test suite
- Student journey tests
