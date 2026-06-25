# Lernio alignment repair report

Date: 2026-06-25
Branch: `codex/safe-brand-vercel`

## Completed in this pass

- Reworked the public header into mobile, tablet/small-laptop, and wide-desktop states.
- Changed the hero to stay single-column until the preview has enough usable width.
- Rebuilt the product preview chrome and tabs with valid Radix tab panels.
- Replaced cramped marketing grids in learning path, learning modes, exam flow, campus rows, tutor demo, and footer.
- Added shared marketing section heading and app page-shell helpers.
- Added global layout tokens for page gutters, content widths, sidebar widths, topbar height, and card gaps.
- Added an authenticated app content container and route-specific shell variants.
- Changed the app sidebar to mobile drawer, compact intermediate rail, and expanded desktop sidebar.
- Moved the app footer inside the main content pane.
- Removed persisted Zustand `view` routing state and changed sidebar, mobile nav, command palette, dashboard, and analytics navigation to push real URLs.
- Converted dashboard grid rows to container-query classes instead of viewport-only `md`/`lg` grids.
- Raised meaningful 9-10px dashboard/preview text to the 12px metadata minimum.
- Added Playwright alignment guardrails for horizontal overflow, clipped controls, and header control overlap.

## Evidence

- `npm run typecheck` passed.
- `npm run lint` passed with warnings only. Existing warnings remain in unrelated files.
- `npm run test` passed: 12 files, 26 tests.
- `npm run build` passed.
- `npm run test:a11y -- --project=chromium` passed on desktop and mobile projects.
- `npx playwright test tests/e2e/alignment.spec.ts --project=chromium` passed: 63 tests.
- Captured screenshots:
  - `test-results/refinement-home-desktop.png`
  - `test-results/refinement-home-mobile.png`
  - `test-results/refinement-sign-up-mobile.png`
  - `test-results/refinement-dashboard-1180.png`

## Local environment notes

- `LERNIO_DEMO_MODE=false` in `.env`.
- `/api/health` returns `200`.
- `/api/ready` returns `503` locally because `DATABASE_URL` points to localhost PostgreSQL and that database is not reachable in the current session.
- Protected app routes redirect to sign-in without a valid session, so full live dashboard verification needs either a running local PostgreSQL/auth session or demo mode enabled.

## Remaining deployment-only work

- Verify the canonical Vercel project and domain ownership in Vercel.
- Ensure production `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and optional AI/OAuth keys are set on the canonical Vercel project.
- Run `npm run ci:migrate` against the production database as a controlled release step before promoting the deployment.
- Confirm `https://lernioai.vercel.app` serves the current branch after Vercel alias/project cleanup.
