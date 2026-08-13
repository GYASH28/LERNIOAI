# Lernio release test report

Date: 1 August 2026

Status: **Ready for review; not ready for production merge**

## What was exercised

- Five-phase Materials behaviour and phase-specific content selection.
- Desktop and 390px mobile navigation through all five phases.
- Page-level horizontal overflow at 390px.
- Subject-pack and generated lesson-note schema validation.
- Cross-platform App Router page discovery.
- TypeScript and ESLint quality gates.

## Results

- `npx tsc --noEmit --pretty false` — passed.
- `npm run lint` — passed with 0 errors and 412 warnings.
- `npm run pages:audit` — passed across 57 pages.
- `npm run notes:validate` — 44 documents valid.
- Focused Vitest suite — 3 files and 10 tests passed.
- Full Vitest suite — 62 files and 231 tests passed; 1 file and 2 tests skipped.
- Curriculum validation — 12 manifests valid.
- Learning OS integrity — passed with 43 explicit content-coverage warnings and 0 approved direct lesson videos.
- Chromium Materials E2E — 2 tests passed.
- Mobile Chromium Materials E2E — 2 tests passed.
- `npm run build` — the default local builder exceeded five minutes.
- `npx next build --webpack` — passed; compiled successfully, typechecked and generated 71 static pages.

## Release decision

Do not merge directly to `main` from this report. Request code review and rerun the full CI matrix. Video publication remains blocked on exact direct-video research plus human academic review, as required by the YouTube implementation brief.
