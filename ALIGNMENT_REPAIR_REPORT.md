# Lernio Reference Alignment Repair Report

## Runtime Identity

- Branch: `codex/reference-matched-alignment`
- Base commit: `6ea40c6db617d9494d762b60f27ae87c11d077ae`
- Local URL: `http://127.0.0.1:3000/`
- Dev server PID on port 3000: `14284`
- Runtime audit artifacts:
  - Before: `test-results/reference-audit-before/`
  - After: `test-results/reference-audit-after/`

## Root Cause

The marketing page depended on viewport-only `xl:` Tailwind grid breakpoints for the hero, process cards, tutor/campus sections, and footer. In the user's effective browser width range (`1100-1180px` CSS pixels), the `xl` breakpoint was not active, so the page rendered as a tablet composition: stacked hero preview, 2x2 process rows, and wrapped footer columns.

The public container also used `width: 100%` plus padding with an 80rem maximum, which made the page look edge-to-edge at important desktop widths. The visual target is more constrained.

## Fix Summary

- Rebuilt `.marketing-container` as a centered, constrained public container using `72rem` max width and responsive gutters.
- Added container-query layout primitives for:
  - two-column hero
  - four-card rows
  - learning modes split panel
  - tutor/campus two-column sections
  - trust 3-column grid
  - four-column footer
- Moved same-element grid layouts into descendants of `.marketing-container` so container queries can actually apply.
- Added semantic Playwright assertions for container centering, hero positioning, card row alignment, two-column sections, footer top alignment, heading size, section spacing, product preview tabs, FAQ states, and mobile menu state.
- Added Chromium visual regression baselines for the marketing homepage, major sections, and product preview tabs.
- Fixed Vercel build compatibility by removing build-time `prisma migrate deploy` from `vercel-build`. Database migrations remain available through `npm run db:deploy`.

## Computed Runtime Findings After Repair

At `1100x736`:

- `.marketing-container`: `width: 1036px`, `margin-left/right: 32px`, `padding-left/right: 0px`, `max-width: 1152px`
- Hero columns: `472.406px 522.141px`
- How cards: four cards on one top baseline
- Exam cards: four cards on one top baseline
- Lab cards: four cards on one top baseline
- Footer: four columns on one top baseline
- Page overflow: `scrollWidth 1100`, `clientWidth 1100`, offenders `[]`

At `1024x768`, the page intentionally remains in tablet composition:

- `.marketing-container`: `width: 960px`, `margin-left/right: 32px`
- Hero: one column
- How/Exam/Labs: 2x2 card rows
- Page overflow: offenders `[]`

## Verification

- `npm run db:generate`: passed
- `npm run lint`: passed with existing repo warnings, 0 errors
- `npm run typecheck`: passed
- `npm run test`: passed, 12 files / 26 tests
- `npm run build`: passed
- `npm run vercel-build`: passed
- `npm run test:a11y -- --project=chromium`: passed
- `npx playwright test tests/e2e/alignment.spec.ts --project=chromium --workers=1`: passed, 73 tests
- `npm run test:visual`: passed, 20 passed / 18 intentionally skipped mobile reference snapshots

## Remaining Notes

- Production Vercel deployment was not inspected from this local workspace. The exact `vercel.json` build command now passes locally without requiring a live database connection during build.
- Runtime application features still require a valid `DATABASE_URL` at runtime and migrations should be run explicitly with `npm run db:deploy` against the production database.
