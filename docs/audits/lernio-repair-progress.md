# Lernio Repair Progress

**Branch:** repair/student-experience-overhaul
**Started:** 2026-07-27

---

## Change Log

### Change 1: Fix ESLint errors in admin/page.tsx

- **Problem:** 2 ESLint errors — "Avoid constructing JSX within try/catch" in `RecentUsers()` function
- **Root cause:** JSX was returned directly inside a try/catch block, which React cannot catch as error boundaries
- **Files modified:** `src/app/admin/page.tsx`
- **Before:** `try { ... return <JSX /> } catch { return <JSX /> }` — ESLint error
- **After:** `try { ... } catch { loadError = true }` — all JSX rendered after the try/catch
- **Remaining risk:** None — same behavior, cleaner code

### Change 2: Remove impractical global effects

- **Problem:** Custom cursor and animated canvas background were mounted globally in the root layout, running on ALL pages including productivity screens (coding, exams, notes, AI chat, video)
- **Root cause:** `AnimatedBackground` and `CustomCursor` were imported and rendered in `src/app/layout.tsx` body, affecting every route
- **Files modified:** `src/app/layout.tsx`
- **Before:** Both effects mounted on every page, causing:
  - Mouse-move jank from custom cursor tracking
  - Canvas animation running behind coding editor, exam questions, notes, and AI chat
  - Battery drain on mobile
  - Interference with form control focus
- **After:** Both effects removed from root layout. The `GlobalExperienceRuntime` (which already had these removed) handles only: AchievementUnlockToaster, SonnerToaster, DevOverlayCleanup
- **Remaining risk:** None — these were decorative, not functional. The components still exist in `src/components/ui/` but are not mounted anywhere.

### Change 3: Create audit document

- **Problem:** No verified audit existed
- **Files created:** `docs/audits/lernio-complete-product-audit.md`
- **Content:** Complete feature audit table, global effects audit, duplicate component audit, "coming soon" audit, mobile navigation audit, architecture audit, silent failure audit, priority actions

---

## Verification

```bash
npx tsc --noEmit          # → 0 errors ✓
npx eslint .              # → 0 errors, 407 warnings ✓
npx next build --webpack  # → ✓ Compiled successfully, 68 pages ✓
```

---

## Remaining Work (Priority Order)

1. Fix 4 student-visible "coming soon" text instances
2. Verify lesson routing works after learn.tsx deletion on main
3. Fix mobile navigation (5-item bottom nav + grouped More sheet)
4. Fix revision reveal flow (see answer before rating)
5. Fix planner timezone (Asia/Kolkata, not UTC)
6. Verify quiz persistence (every attempt saved to DB)
7. Remove unused global effect components
8. Clean up `as any` in touched files
9. Canonical route registry
10. Curriculum source of truth consolidation
