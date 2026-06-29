# Testing and Release Plan

## Required Commands

```bash
npm run check
npm run build
npm run curriculum:extract-timetable-columns
npm run curriculum:extract-timetable
npm run curriculum:extract-catalog
npm run curriculum:unit-review-queue
npm run coverage:learning
npm run resources:link-health
npm run test:e2e
npm run test:a11y
npm run test:visual
```

## Unit Test Additions

- Target programme list exposes only COMP/DCOMP and CIOT/DCIOT.
- Archived department exclusion.
- `getStudentLearningScope()` for DCOMP Semester 1, DCIOT Semester 2, advanced DCOMP and advanced DCIOT.
- Curriculum manifest validation.
- Official course-outcome extraction from PDF text.
- Official course catalog extraction remains review-only and blocks unplaced courses from publication.
- Official timetable evidence extraction remains review-only and publication-blocked.
- Official unit-candidate quality gating blocks truncated, non-consecutive or table-noise unit titles.
- Official unit candidate review queue preserves blockers and never publishes extracted units.
- Subject applicability and shared first-year mappings.
- YouTube canonicalization and dedupe.
- YouTube candidate review queue blocks unplaced official subjects, missing manifest subjects and missing verified lesson structure.
- Link-health classification and report generation.
- Lesson-resource ordering and publication-state filtering.
- Shared student publication policy for resources, LessonResource mappings and generated documents.
- Completion calculation and XP idempotency.
- Generated-note validation.
- Generated-content workflow state transitions and no-auto-publish guardrails.
- Validated note PDF artifact naming/render worker.
- LEO retrieval scope.
- Scoped learning search ranking and canonical route generation.
- Machine-readable curriculum/resource coverage report.
- Coding challenge learning-scope filters and submission curriculum context derivation.

## Integration Test Additions

- Department scope dry-run and write idempotency.
- `/api/academics` exact programme/semester filtering.
- Materials/resource APIs reject out-of-scope subject IDs.
- Materials/resource APIs filter approved lesson resources by scoped `lessonId`.
- `/api/coding` returns only global practice plus in-scope linked challenges and rejects out-of-scope draft saves.
- Lesson progress rejects inaccessible lesson IDs.
- Semester, subject, unit and lesson loaders.
- Reviewer publication flow.
- Cache invalidation on publication.

## End-to-End Additions

- COMP Semester 1 student.
- CIOT Semester 2 student with BEEE.
- COMP advanced-semester student.
- CIOT advanced-semester student.
- Deep-link to lesson and resume video.
- Approved lesson notes in-app and PDF download.
- Broken primary video fallback.
- Reviewer approving generated PDF.
- Student blocked from draft content.
- Other departments absent from onboarding and student navigation.
- Mobile, keyboard and accessibility flow.

## Release Gates

- Database backup completed.
- Migrations applied with `npm run db:deploy`.
- Department scope dry-run reviewed before write.
- Content imports run in dry-run before write.
- No production build runs destructive seed or long content-generation jobs.
- Post-deploy health checks:
  - `/api/health`
  - `/api/ready`
  - dashboard bootstrap for DCOMP and DCIOT students
  - `/learn` redirect
  - canonical lesson deep link
  - LEO citation check

## Current Verification Gaps

- `pdftoppm` is not installed. The Winter 2025 timetable was rendered and visually checked with `pypdfium2`; broader PDF visual checks should use the same fallback or install Poppler.
- Official R23 PDFs are structure-parsed for COMP Semester 1-6 and CIOT Semester 1-2; CIOT Semester 3-6 are represented by explicit empty blocker manifests and still need official semester-placement verification before subjects can be added. The Winter 2025 timetable now provides 41 review-only CP/CI code appearances, 34 unique codes and 0 publication-ready semester manifests.
- The official course catalog extractor reports 81 source-backed course identities, but 26 CIOT course entries remain unplaced and blocked until official semester-placement evidence is obtained.
- Units, topics and practical experiments still need official parsing/review before publication. Official course outcomes are promoted for 51 of 59 current subject structures.
- Current official extraction has 27 subjects with unit candidates, but the unit review queue reports 0 ready for promotion, 27 needing manual review and 32 blocked.
- The YouTube candidate review queue has 252 draft subject mappings, 0 ready for lesson-level mapping, 65 unplaced official-subject blockers, 18 missing-manifest blockers and 169 missing-lesson-structure blockers.
- Coding challenges now support optional curriculum links and scoped API filtering, but imported reviewed mappings and the production C++ runner are still pending.
- Materials can now filter by lesson through approved `LessonResource` mappings; production coverage still depends on publishing those mappings.
- The local app starts and `/api/health` returns 200, but `/api/ready` returns 503 until PostgreSQL is reachable at the configured `localhost:5432` database URL.
- The latest local post-Phase 8 run on 2026-06-28 passed `npm run build`, `npm run test:e2e` (146 tests), `npm run test:a11y` (2 tests) and `npm run test:visual` (2 tests).
